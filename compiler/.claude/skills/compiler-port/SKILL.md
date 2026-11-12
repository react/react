---
name: compiler-port
description: Port a compiler pass from TypeScript to Rust. Gathers context, plans the port, implements in a subagent with test-fix loop, then reviews.
---

# Port Compiler Pass

Port a compiler pass from TypeScript to Rust end-to-end.

Arguments:
- $ARGUMENTS: Pass name exactly as it appears in Pipeline.ts log entries (e.g., `PruneMaybeThrows`, `SSA`, `ConstantPropagation`)

## Step 0: Validate pass name

1. Read `compiler/packages/babel-plugin-react-compiler/src/Entrypoint/Pipeline.ts`
2. Search for `name: '$ARGUMENTS'` in log entries
3. If not found, list all available pass names from the `log({...name: '...'})` calls and stop
4. Check the `kind` field of the matching log entry:
   - If `kind: 'ast'`, report that test-rust-port only supports `hir` and `reactive` kind passes currently and stop
   - If `kind: 'hir'` or `kind: 'reactive'`, proceed

## Step 1: Determine TS source files and Rust crate

1. Follow the import in Pipeline.ts to find the actual TypeScript file(s) for the pass
2. Map the TS folder to a Rust crate using this mapping:

| TypeScript Path | Rust Crate |
|---|---|
| `src/HIR/` (excluding `BuildHIR.ts`, `HIRBuilder.ts`) | `react_compiler_hir` |
| `src/HIR/BuildHIR.ts`, `src/HIR/HIRBuilder.ts` | `react_compiler_lowering` |
| `src/Babel/`, `src/Entrypoint/` | `react_compiler` |
| `src/CompilerError.ts` | `react_compiler_diagnostics` |
| `src/ReactiveScopes/` | `react_compiler_reactive_scopes` |
| `src/<Name>/` | `react_compiler_<name>` (1:1, e.g., `src/Optimization/` -> `react_compiler_optimization`) |

3. Check if the pass is already ported:
   - Check if the corresponding Rust file exists in the target crate
   - Check if `compiler/crates/react_compiler/src/entrypoint/pipeline.rs` already calls it
   - If both are true, report the pass is already ported and stop

## Step 2: Gather context

Read the following files (all reads happen in main context):

1. **Architecture guide**: `compiler/docs/rust-port/rust-port-architecture.md`
2. **Pass documentation**: Check `compiler/packages/babel-plugin-react-compiler/docs/passes/` for docs about this pass
3. **TypeScript source**: All TypeScript source files for the pass + any helpers imported from the same folder
4. **Rust pipeline**: `compiler/crates/react_compiler/src/entrypoint/pipeline.rs`
5. **Rust HIR types**: Key type files in `compiler/crates/react_compiler_hir/src/` (especially `hir.rs`, `environment.rs`)
6. **Rust reactive types**: For reactive passes, also read `compiler/crates/react_compiler_hir/src/reactive_function.rs`
7. **Target crate**: If the target crate already exists, read its `Cargo.toml`, `src/lib.rs`, and existing files to understand the current structure

## Step 3: Create implementation plan

Based on the gathered context, create and present a plan covering:

1. **New types needed**: Any Rust types that need to be added or modified
2. **Files to create**: List of new Rust files with their TS counterparts
3. **Crate setup**: Whether a new crate is needed or adding to an existing one
4. **Pipeline wiring**: How the pass will be called from `pipeline.rs`
5. **Key translation decisions**: Any non-obvious TS-to-Rust translations

Present the plan to the user, then proceed to implementation.

## Step 4: Implementation

Launch the `port-pass` agent with all gathered context:

- Pass name: `$ARGUMENTS`
- TypeScript source file content(s)
- Target Rust crate name and path
- Pipeline wiring details
- Implementation plan from Step 3
- Architecture guide content
- Current pipeline.rs content
- Existing crate structure (if any)

The agent will:
1. Port the TypeScript code to Rust
2. Create or update the crate as needed
3. Wire the pass into pipeline.rs
4. Run the test-fix loop until 0 failures (see agent prompt for details)

## Step 5: Review loop

1. Run `/compiler-review` on the changes
2. If issues are found:
   - Launch the `port-pass` agent again with:
     - The review findings
     - Instruction to fix the issues
     - Instruction to re-run `bash compiler/scripts/test-rust-port.sh` (no args, auto-detects last ported pass) to confirm 0 failures still hold
   - After the agent completes, run `/compiler-review` again
3. Repeat until review is clean

## Step 6: Final report

Report to the user:
- Files created and modified
- Test results (pass count)
- Review status
- Do NOT auto-commit (user should review and commit manually, or use `/compiler-commit`)
