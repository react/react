# React Compiler Rust Port — Workflow Guide

Analysis of 141 Claude Code sessions from 2026-03-13 to 2026-04-10, totaling ~17,460 tool invocations across the Rust compiler port.

---

## 1. Project Timeline & Phases

| Phase | Dates | Focus | Sessions |
|-------|-------|-------|----------|
| **Research** | Mar 13–14 | Feasibility study, shared mutability analysis, pass-by-pass research | ~10 |
| **Planning** | Mar 14–16 | Architecture docs, numbered plans (0001–0005), scope types | ~15 |
| **Core Implementation** | Mar 16–25 | Babel AST crate, HIR lowering, pass porting, BuildHIR | ~50 |
| **Testing & Stabilization** | Mar 25–31 | Snap tests, test-rust-port 100%, OXC/SWC frontends | ~30 |
| **E2E & Diagnostics** | Apr 1–4 | Error formatting, diagnostic events, CI, e2e tests | ~20 |
| **Internal Validation** | Apr 6–10 | Testing against Meta internal code, minimize-rust-delta, hermes-parser | ~10 |

### Key Milestones
- **Mar 25**: All 1717/1717 pass-level + code-level tests passing
- **Mar 30**: Snap tests 1717/1718 (99.9%)
- **Mar 31**: OptimizeForSSR ported, snap 1725/1725
- **Apr 2**: E2E babel 1722/1724, diagnostic events aligned
- **Apr 4**: CI workflow configured, SWC/OXC e2e progress
- **Apr 6–10**: Internal codebase validation against Meta internal production code

---

## 2. Custom Skills (Claude Code)

Seven custom skills were created in `compiler/.claude/skills/`. These are critical to the workflow and should be loaded at the start of each session:

| Skill | Usage Count | Purpose |
|-------|-------------|---------|
| `/compiler-verify` | 47 | Detects TS vs Rust changes, runs appropriate test suites |
| `/compiler-commit` | 30 | Runs verify + review, then commits with `[compiler]` or `[rust-compiler]` prefix, updates orchestrator log |
| `/compiler-review` | 21 | Launches a review subagent that compares Rust port against TS originals |
| `/compiler-orchestrator` | 5 | Autonomous loop: discover frontier → fix failures → port next pass → review → commit |
| `/compiler-port` | 5 | Port a single named pass end-to-end (looks up in Pipeline.ts, maps to Rust crate, implements, tests) |
| `/rust-port-status` | — | Reports current test pass rates |
| `/plan-update` | — | Updates numbered plan documents |

### Typical Workflow Loop

```
1. /compiler-orchestrator (or manual work)
   └── Discovers current test state
   └── Fixes failures or ports next pass
   └── Calls /compiler-verify internally
   └── Calls /compiler-review internally
   └── Calls /compiler-commit when ready

2. Manual variant:
   > "Fix X"
   > /compiler-verify
   > /compiler-review
   > /compiler-commit
```

### Important Skill Loading Note

The `/compiler-orchestrator` skill sometimes fails to auto-load. The workaround is:

```
> load the skill compiler/.claude/skills/compiler-orchestrator/SKILL.md
```

This happened multiple times in the trajectory history and your team should be aware of it.

---

## 3. Test Commands & Infrastructure

### Primary Test Scripts (by frequency of use)

| Command | Invocations | Purpose |
|---------|-------------|---------|
| `bash compiler/scripts/test-rust-port.sh` | 1,345 | Compare Rust vs TS compiler output per-pass for all fixtures |
| `bash compiler/scripts/test-e2e.sh` | 269 | End-to-end: code output + diagnostic events across babel/swc/oxc |
| `cargo check` | 251 | Fast Rust compilation check |
| `npx tsx` | 207 | Run TypeScript scripts directly |
| `cargo build` | 179 | Full Rust build |
| `bash compiler/scripts/test-babel-ast.sh` | 174 | Babel AST round-trip serialization tests |
| `yarn snap --rust` | 121 | Snap fixture tests using Rust compiler backend |
| `yarn snap` | 63 | Snap fixture tests using TS compiler |
| `cargo test` | 46 | Rust unit tests |

### Test Result Formats

`test-rust-port.sh` supports `--json` for machine-readable output:
```bash
bash compiler/scripts/test-rust-port.sh --json 2>/dev/null
# Returns: { pass, autoDetected, total, passed, failed, frontier, perPass, failures }
```

`test-e2e.sh` reports in table format:
```
| variant | code | events | total |
| babel   | 1725/1725 (100%) | 1725/1725 (100%) | ... |
| swc     | 1723/1725 (99.9%) | ... | ... |
```

### Test Against Internal Codebase

Recent work (Apr 6–10) tested against Meta internal production code. Key patterns:

```bash
# Run with specific compilation mode against an external directory
bash compiler/scripts/test-rust-port.sh --mode syntax <path-to-source-dir>

# Use test-internal-files.sh with the production config and source root
bash compiler/scripts/test-internal-files.sh <config-path> <source-root> [flags]
```

- Files with `@flow` need hermes-parser (recently added to test-rust-port.ts)
- Must pass `compilationMode` to match production config
- Use `yarn snap minimize-rust-delta <path>` to find minimal repro for TS/Rust differences

---

## 4. Cargo & Rust Workflow

### Crate Structure

| Crate | Purpose |
|-------|---------|
| `react_compiler` | Main entrypoint, pipeline orchestration |
| `react_compiler_ast` | Babel AST types + serde |
| `react_compiler_hir` | HIR types, environment, visitors |
| `react_compiler_lowering` | BuildHIR, HIRBuilder (AST → HIR) |
| `react_compiler_inference` | Mutation/aliasing/type inference |
| `react_compiler_optimization` | Optimization passes |
| `react_compiler_validation` | Validation passes |
| `react_compiler_reactive_scopes` | Reactive scope building + codegen |
| `react_compiler_diagnostics` | Error types, code frames |
| `react_compiler_e2e_cli` | E2E test binary |
| `react_compiler_swc` | SWC frontend |
| `react_compiler_oxc` | OXC frontend |

### Common Cargo Patterns

```bash
# Fast check (most common, 214 invocations)
cargo check --manifest-path compiler/crates/Cargo.toml

# Build the NAPI binary for JS interop
cargo build --manifest-path compiler/crates/Cargo.toml

# Run Rust unit tests
cargo test --manifest-path compiler/crates/Cargo.toml
```

---

## 5. Agent Patterns

994 total agent invocations across sessions.

| Agent Type | Count | Typical Use |
|------------|-------|-------------|
| `general` / `general-purpose` | 748 | Implementation, fixing, research |
| `meta_codesearch:code_search` | 204 | Codebase exploration |
| `Plan` | 20 | Architecture/implementation planning |
| `Explore` | 16 | Codebase navigation |
| `statusline-setup` | 4 | Terminal UI configuration |

### Common Agent Patterns

1. **Parallel pass research**: Launch one agent per compiler pass to analyze TS implementation for port feasibility
2. **Review agents**: Dedicated "Review Rust port changes" agents (14 invocations)
3. **Fix-specific agents**: "Fix AnalyseFunctions failures" (4x), "Fix PruneMaybeThrows validation failures" (2x)
4. **Worktree isolation**: 16 worktree entries for isolated implementation work

### Worktree Usage

Worktrees were used for larger changes that might need to be abandoned:
- `worktree-build-hir-impl` — BuildHIR implementation
- `worktree-structured-yawning-forest-rust` — test-rust-port enhancements
- `worktree-ts-to-rust-transpiler` — explored mechanical TS→Rust transpilation (abandoned)
- `worktree-module-type-provider` — module type provider work

---

## 6. Key Files (by edit frequency)

### Most Frequently Modified Files

| File | Edits | Reads | Purpose |
|------|-------|-------|---------|
| `rust-port-orchestrator-log.md` | 135 | 104 | Running log of orchestrator progress |
| `build_hir.rs` | 112 | 162 | Core HIR lowering from AST |
| `program.rs` (entrypoint) | 103 | 173 | Main compilation entrypoint |
| `rust-port-research.md` | 85 | 47+21 | Research & analysis document |
| `test-rust-port.ts` | 77 | 90 | Primary test comparison script |
| `pipeline.rs` | 48 | 64 | Compiler pass pipeline |
| `test-e2e.ts` | 42 | 27 | End-to-end test script |
| `hir_builder.rs` | 37 | 53 | HIR builder utilities |
| `infer_mutation_aliasing_effects.rs` | 32 | 48 | Most complex inference pass |
| `runner.ts` (snap) | 32 | 35 | Snap test runner |

---

## 7. Repeated Workflow Patterns

### Pattern 1: "Analyze → Don't Fix → Report"
Used extensively in recent internal validation work:
```
> Try running test-rust-port.sh with --mode 'syntax' against <path>. Analyze success/failure to categorize and report back. Do not proactively fix.
```

### Pattern 2: "Research → Plan → Implement → Verify → Review → Commit"
The standard development cycle:
```
> Do additional research into <topic>
> Create a plan in compiler/docs/rust-port/...
> Implement the work in <plan>
> /compiler-verify
> /compiler-review
> /compiler-commit
```

### Pattern 3: "Team of Agents"
For large implementation tasks:
```
> Use a team of agents (opus) to implement the remainder of the items in <plan>. Make sure to thoroughly test, verify the implementation against the plan. Use /compiler-verify and /compiler-commit.
```

### Pattern 4: "Orchestrator Loop"
For autonomous progress:
```
> /compiler-orchestrator
  (or: load the skill compiler/.claude/skills/compiler-orchestrator/SKILL.md)
```

### Pattern 5: "Debug CI"
```
> debug the GitHub CI failure run at <github-actions-url>
> <paste error output>
> /compiler-commit
```

### Pattern 6: "Minimize Delta"
For finding minimal repros of TS/Rust differences:
```
> yarn snap minimize-rust-delta <path>
```

### Pattern 7: "Interrupt and Redirect"
Joe frequently interrupts Claude mid-task to correct course:
- `[Request interrupted by user]` appears ~50+ times
- Common pattern: interrupt → provide specific guidance → continue
- Example: "you should be using `env.record_error(...)?`."

---

## 8. Key Architectural Decisions (from trajectory)

These came up repeatedly in prompts and are important context:

1. **InstructionId over InstructionValue references**: Key insight that caches in InferMutationAliasingEffects can use `InstructionId` (interned) instead of holding references to `InstructionValue` objects, avoiding Rust borrow conflicts.

2. **Environment is shared mutable**: Like HIR, the Environment object is mutably shared. Both needed careful Rust representation.

3. **Error handling convention**: `env.record_error(...)?` — record_error returns `Err` only for Invariant category errors. Use `?` for short-circuit. Only use `let _ = ...` when both the category is non-Invariant AND you explicitly want to continue.

4. **Keep logic in Rust core**: The babel/swc/oxc integrations should be thin wrappers. All interesting logic belongs in the Rust crates.

5. **Commit prefix convention**: `[rust-compiler]` for changes to `compiler/crates/`, `[compiler]` for everything else.

6. **No normalization in tests**: Minimize output normalization — run code through prettier only, compare directly. Added: reparse with babel → regenerate with `compact:true` → prettier.

---

## 9. Current State & Remaining Work

### Test Results (as of latest orchestrator log)
- **test-rust-port**: 1724/1724 (100%)
- **yarn snap --rust**: 1725/1725 (100%)
- **E2E babel**: 1722/1724 (2 inherent platform differences)
- **E2E swc**: Partial — event matching in progress
- **E2E oxc**: Partial — event matching in progress

### Active Work Streams (as of Apr 10)
1. **Internal validation**: Testing against Meta internal production code with production configs
2. **Minimize rust deltas**: Using `yarn snap minimize-rust-delta` to find minimal repro cases for TS/Rust differences
3. **New test-internal-files script**: `compiler/scripts/test-internal-files.ts` — for testing against an external codebase with its production config
4. **compilationMode: 'syntax'** support was recently added and validated
5. **hermes-parser integration**: For `@flow` files in the internal codebase

### Remaining Gaps
- SWC/OXC e2e event differences (structural, not code)
- Some internal codebase fixtures still show code differences between TS and Rust
- Internal skip list exists at `compiler/.test-internal-skip-list`
- Performance optimization: potential for returning per-function replacements instead of full program

---

## 10. Recommendations for Team Picking Up

### Getting Started
1. Read `compiler/docs/rust-port/rust-port-research.md` and `rust-port-notes.md` for architectural context
2. Read all numbered plans in `compiler/docs/rust-port/rust-port-0001-*` through `0005-*`
3. Review `compiler/docs/rust-port/rust-port-orchestrator-log.md` for chronological progress
4. Review `compiler/docs/rust-port/rust-port-gap-analysis.md` for known gaps

### Essential Skill Loading
At the start of each Claude session:
```
> load the skill compiler/.claude/skills/compiler-orchestrator/SKILL.md
```
This ensures all six custom skills are available. If a skill isn't recognized, load it explicitly.

### Daily Workflow
```bash
# Check current state
bash compiler/scripts/test-rust-port.sh
bash compiler/scripts/test-e2e.sh
yarn snap --rust

# After making changes
/compiler-verify
/compiler-review
/compiler-commit <title>
```

### Key Commands to Know
```bash
# Fast iteration cycle
cargo check --manifest-path compiler/crates/Cargo.toml
bash compiler/scripts/test-rust-port.sh
yarn snap --rust

# Debug a specific fixture
yarn snap --rust -p <fixture-name> -d

# Compare TS vs Rust for a specific file
npx tsx compiler/scripts/test-rust-port.ts <pass-name>

# Find minimal repro for TS/Rust difference
yarn snap minimize-rust-delta <fixture-path>

# Test against an external codebase with its production config
bash compiler/scripts/test-internal-files.sh <config-path> <source-root> [flags]

# E2E test across all frontends
bash compiler/scripts/test-e2e.sh
```

### Working Style Notes
- Joe used Opus 4.6 as the primary model throughout
- Frequent use of `/clear` between logical work units
- Heavy use of "analyze and report, don't fix" for investigation phases
- Corrections were provided inline with specific code patterns (e.g., "you should be using `env.record_error(...)?`")
- Plans were maintained in numbered markdown docs and updated as work progressed
- The orchestrator log (`rust-port-orchestrator-log.md`) serves as the canonical progress record

### CI Configuration
GitHub CI workflow: `.github/workflows/compiler_rust.yml`
- Triggers on changes to `compiler/` directory
- Runs: `cargo check` → `cargo build` → `test-babel-ast.sh` → `test-rust-port.sh` → `yarn snap --rust`
- Job name appears as "React Compiler (Rust) Tests" in GitHub

---

*Generated 2026-04-10 from analysis of 141 Claude Code conversation trajectories.*
