# Rust Port: ReactiveFunction and Reactive Passes

Current status: **Phase 2 In Progress** — Reactive types, crate skeleton, TS/Rust debug printers, and BuildReactiveFunction are implemented. 1458/1717 fixtures pass (85%). Remaining failures are mostly earlier-pass error propagation differences and a few loop scheduling edge cases.

## Overview

This document covers porting the reactive function representation and all passes from `BuildReactiveFunction` through `CodegenReactiveFunction` from TypeScript to Rust.

The reactive function is a tree-structured IR derived from the HIR CFG. `BuildReactiveFunction` converts the flat CFG into a nested tree where control flow constructs (if/switch/loops/try) and reactive scopes are represented as nested blocks rather than block references. Subsequent passes prune, merge, and transform scopes, then codegen converts the tree to output AST.

## 1. Rust Type Representation

**Location**: New file `compiler/crates/react_compiler_hir/src/reactive.rs`, re-exported from `lib.rs`

All types derive `Debug, Clone`.

### ReactiveFunction

```rust
/// Tree representation of a compiled function, converted from the CFG-based HIR.
/// TS: ReactiveFunction in HIR.ts
pub struct ReactiveFunction {
    pub loc: Option<SourceLocation>,
    pub id: Option<String>,
    pub name_hint: Option<String>,
    pub params: Vec<ParamPattern>,
    pub generator: bool,
    pub is_async: bool,
    pub body: ReactiveBlock,
    pub directives: Vec<String>,
    // No env field — passed separately per established Rust convention
}
```

### ReactiveBlock and ReactiveStatement

```rust
/// TS: ReactiveBlock = Array<ReactiveStatement>
pub type ReactiveBlock = Vec<ReactiveStatement>;

/// TS: ReactiveStatement (discriminated union with 'kind' field)
pub enum ReactiveStatement {
    Instruction(ReactiveInstruction),
    Terminal(ReactiveTerminalStatement),
    Scope(ReactiveScopeBlock),
    PrunedScope(PrunedReactiveScopeBlock),
}
```

### ReactiveInstruction and ReactiveValue

```rust
/// TS: ReactiveInstruction
pub struct ReactiveInstruction {
    pub id: EvaluationOrder,              // TS InstructionId = Rust EvaluationOrder
    pub lvalue: Option<Place>,
    pub value: ReactiveValue,
    pub effects: Option<Vec<AliasingEffect>>,
    pub loc: Option<SourceLocation>,
}

/// Extends InstructionValue with compound expression types that were
/// separate blocks+terminals in HIR but become nested expressions here.
/// TS: ReactiveValue = InstructionValue | ReactiveLogicalValue | ...
pub enum ReactiveValue {
    /// All ~35 base instruction value kinds
    Instruction(InstructionValue),

    /// TS: ReactiveLogicalValue
    LogicalExpression {
        operator: LogicalOperator,
        left: Box<ReactiveValue>,
        right: Box<ReactiveValue>,
        loc: Option<SourceLocation>,
    },

    /// TS: ReactiveTernaryValue
    ConditionalExpression {
        test: Box<ReactiveValue>,
        consequent: Box<ReactiveValue>,
        alternate: Box<ReactiveValue>,
        loc: Option<SourceLocation>,
    },

    /// TS: ReactiveSequenceValue
    SequenceExpression {
        instructions: Vec<ReactiveInstruction>,
        id: EvaluationOrder,
        value: Box<ReactiveValue>,
        loc: Option<SourceLocation>,
    },

    /// TS: ReactiveOptionalCallValue
    OptionalExpression {
        id: EvaluationOrder,
        value: Box<ReactiveValue>,
        optional: bool,
        loc: Option<SourceLocation>,
    },
}
```

### Terminals

```rust
pub struct ReactiveTerminalStatement {
    pub terminal: ReactiveTerminal,
    pub label: Option<ReactiveLabel>,
}

pub struct ReactiveLabel {
    pub id: BlockId,
    pub implicit: bool,
}

pub enum ReactiveTerminalTargetKind {
    Implicit,
    Labeled,
    Unlabeled,
}

pub enum ReactiveTerminal {
    Break {
        target: BlockId,
        id: EvaluationOrder,
        target_kind: ReactiveTerminalTargetKind,
        loc: Option<SourceLocation>,
    },
    Continue {
        target: BlockId,
        id: EvaluationOrder,
        target_kind: ReactiveTerminalTargetKind,
        loc: Option<SourceLocation>,
    },
    Return {
        value: Place,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
    Throw {
        value: Place,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
    Switch {
        test: Place,
        cases: Vec<ReactiveSwitchCase>,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
    DoWhile {
        loop_block: ReactiveBlock,          // "loop" is a Rust keyword
        test: ReactiveValue,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
    While {
        test: ReactiveValue,
        loop_block: ReactiveBlock,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
    For {
        init: ReactiveValue,
        test: ReactiveValue,
        update: Option<ReactiveValue>,
        loop_block: ReactiveBlock,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
    ForOf {
        init: ReactiveValue,
        test: ReactiveValue,
        loop_block: ReactiveBlock,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
    ForIn {
        init: ReactiveValue,
        loop_block: ReactiveBlock,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
    If {
        test: Place,
        consequent: ReactiveBlock,
        alternate: Option<ReactiveBlock>,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
    Label {
        block: ReactiveBlock,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
    Try {
        block: ReactiveBlock,
        handler_binding: Option<Place>,
        handler: ReactiveBlock,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
}

pub struct ReactiveSwitchCase {
    pub test: Option<Place>,
    pub block: Option<ReactiveBlock>,       // TS: ReactiveBlock | void
}
```

### Scope Blocks

```rust
pub struct ReactiveScopeBlock {
    pub scope: ScopeId,                     // Arena pattern: scope data in Environment
    pub instructions: ReactiveBlock,
}

pub struct PrunedReactiveScopeBlock {
    pub scope: ScopeId,
    pub instructions: ReactiveBlock,
}
```

### Reused Existing Types

All of these are already defined in `react_compiler_hir`:
- `Place`, `InstructionValue`, `AliasingEffect`, `LogicalOperator`, `ParamPattern`
- `BlockId`, `ScopeId`, `IdentifierId`, `EvaluationOrder`, `TypeId`, `FunctionId`
- `SourceLocation` (from `react_compiler_diagnostics`)
- `ReactiveScope`, `ReactiveScopeDependency`, `ReactiveScopeDeclaration`, `ReactiveScopeEarlyReturn`

### Key Design Decisions

1. **ReactiveValue wraps InstructionValue**: `ReactiveValue::Instruction(InstructionValue)` wraps the existing ~35-variant enum. Passes that match specific kinds use `ReactiveValue::Instruction(InstructionValue::FunctionExpression { .. })`.

2. **Box for recursive types**: `ReactiveValue` fields use `Box<ReactiveValue>` for recursion. `ReactiveBlock` (Vec) naturally heap-allocates, breaking the size cycle for terminals.

3. **ScopeId, not cloned scope**: `ReactiveScopeBlock` stores `ScopeId`. Scope data lives in `env.scopes[scope_id]`. Passes that read/write scope data access it through the environment.

4. **No Environment on ReactiveFunction**: Passes take `env: &Environment` or `env: &mut Environment` as a separate parameter, following the established Rust pattern.

5. **EvaluationOrder, not InstructionId**: The TS `InstructionId` (evaluation order counter) maps to Rust `EvaluationOrder`. Rust's `InstructionId` is the flat instruction table index (not used in reactive types).

## 2. New Crate: `react_compiler_reactive_scopes`

```
compiler/crates/react_compiler_reactive_scopes/
  Cargo.toml
  src/
    lib.rs
    build_reactive_function.rs
    print_reactive_function.rs
    visitors.rs
    assert_well_formed_break_targets.rs
    assert_scope_instructions_within_scopes.rs
    prune_unused_labels.rs
    prune_non_escaping_scopes.rs
    prune_non_reactive_dependencies.rs
    prune_unused_scopes.rs
    merge_reactive_scopes_that_invalidate_together.rs
    prune_always_invalidating_scopes.rs
    propagate_early_returns.rs
    prune_unused_lvalues.rs
    promote_used_temporaries.rs
    extract_scope_declarations_from_destructuring.rs
    stabilize_block_ids.rs
    rename_variables.rs
    prune_hoisted_contexts.rs
    validate_preserved_manual_memoization.rs
```

**Cargo.toml dependencies**: `react_compiler_hir`, `react_compiler_diagnostics`, `indexmap`

Add to workspace `Cargo.toml` members and as dependency of `react_compiler`.

Maps to TS directory: `src/ReactiveScopes/`

## 3. Debug Printing

### Approach: New Verbose Format (like DebugPrintHIR)

Create a new verbose `DebugPrintReactiveFunction` format that prints every field of every type recursively, analogous to `DebugPrintHIR`. Both TS and Rust need new implementations.

### TS Side

Create `compiler/packages/babel-plugin-react-compiler/src/HIR/DebugPrintReactiveFunction.ts`:

- Entry point: `export function printDebugReactiveFunction(fn: ReactiveFunction): string`
- Uses the same `DebugPrinter` class from `DebugPrintHIR.ts`
- Prints function metadata: id, name_hint, generator, async, loc, params (full Place detail), directives
- Recursively prints `fn.body` (ReactiveBlock):
  - `ReactiveInstruction`: id, lvalue (full Place with identifier declaration), value, effects, loc
  - `ReactiveScopeBlock`/`PrunedReactiveScopeBlock`: full scope detail (id, range, dependencies with paths and locs, declarations with identifier info, reassignments, earlyReturnValue, merged, loc), then nested instructions
  - `ReactiveTerminalStatement`: label info, terminal kind, all fields including nested blocks
  - `ReactiveValue` compound types: kind, all fields recursively; `Instruction` variant delegates to `formatInstructionValue`
- Appends outlined functions and Environment errors (same pattern as DebugPrintHIR)
- Reuses shared formatters: `formatPlace`, `formatIdentifier`, `formatType`, `formatLoc`, `formatAliasingEffect`, `formatInstructionValue`
- Export from `compiler/packages/babel-plugin-react-compiler/src/HIR/index.ts`

### Rust Side

`compiler/crates/react_compiler_reactive_scopes/src/print_reactive_function.rs`:

- Entry point: `pub fn debug_reactive_function(func: &ReactiveFunction, env: &Environment) -> String`
- Uses the `DebugPrinter` struct pattern from `compiler/crates/react_compiler/src/debug_print.rs`
- Must produce output identical to the TS `printDebugReactiveFunction`

### Shared Print Helpers

Extract these as `pub` from `compiler/crates/react_compiler/src/debug_print.rs` (currently private):
- `format_place(place, env) -> String`
- `format_identifier(id, env) -> String`
- `format_type(type_id, env) -> String`
- `format_loc(loc) -> String`
- `format_aliasing_effect(effect) -> String`
- `format_instruction_value(value, env, indent) -> Vec<String>`
- The `DebugPrinter` struct itself (or extract to a shared module)

## 4. Test Infrastructure Changes

### `compiler/scripts/test-rust-port.ts`

1. **Import** `printDebugReactiveFunction` from the new TS file

2. **Handle `kind: 'reactive'`** — replace the `throw new Error(...)` at lines 297-305:
   ```typescript
   } else if (entry.kind === 'reactive') {
     log.push({
       kind: 'entry',
       name: entry.name,
       value: printDebugReactiveFunction(entry.value),
     });
   }
   ```

3. **Handle `kind: 'ast'`** — keep the TODO error for now (codegen is deferred)

4. **ID normalization** — the existing `normalizeIds` function handles `bb\d+`, `@\d+`, `Identifier(\d+)`, `Type(\d+)`, `\w+\$\d+`, `mutableRange` patterns. Should work for reactive output. Verify after BuildReactiveFunction is ported; may need additional patterns for scope-specific fields in the verbose format.

### Rust Pipeline (`pipeline.rs`)

After `PropagateScopeDependenciesHIR`, transition from HIR to ReactiveFunction:

```rust
let mut reactive_fn = react_compiler_reactive_scopes::build_reactive_function(&hir, &env);
let debug = react_compiler_reactive_scopes::debug_reactive_function(&reactive_fn, &env);
context.log_debug(DebugLogEntry::new("BuildReactiveFunction", debug));

react_compiler_reactive_scopes::assert_well_formed_break_targets(&reactive_fn)?;
context.log_debug(DebugLogEntry::new("AssertWellFormedBreakTargets", "ok".to_string()));

react_compiler_reactive_scopes::prune_unused_labels(&mut reactive_fn);
let debug = react_compiler_reactive_scopes::debug_reactive_function(&reactive_fn, &env);
context.log_debug(DebugLogEntry::new("PruneUnusedLabels", debug));

// ... etc for each pass
```

## 5. Phased Porting Plan

### Phase 1 — Foundation

1. Create `reactive.rs` in `react_compiler_hir` with all types from Section 1
2. Create `react_compiler_reactive_scopes` crate skeleton with `Cargo.toml` and empty `lib.rs`
3. Create TS `DebugPrintReactiveFunction.ts` with verbose format
4. Extract shared print helpers from `debug_print.rs` as public
5. Port verbose format to Rust `print_reactive_function.rs`
6. Update `test-rust-port.ts` to handle `kind: 'reactive'`

### Phase 2 — BuildReactiveFunction

The critical pass (~700 lines). Converts HIR CFG to ReactiveFunction tree.

- **Source**: `compiler/packages/babel-plugin-react-compiler/src/ReactiveScopes/BuildReactiveFunction.ts`
- **Target**: `compiler/crates/react_compiler_reactive_scopes/src/build_reactive_function.rs`
- **Key structures to port**:
  - `Context` class: tracks `emitted: Set<BlockId>`, `scopeFallthroughs: Set<BlockId>`, `#scheduled: Set<BlockId>`, `#catchHandlers: Set<BlockId>`, `#controlFlowStack: Array<ControlFlowTarget>`
  - `Driver` class: `traverseBlock`, `visitBlock`, `visitValueBlock`, `visitValueBlockTerminal`, `visitTestBlock`, `extractValueBlockResult`, `wrapWithSequence`, `visitBreak`, `visitContinue`
- **Signature**: `pub fn build_reactive_function(hir: &HirFunction, env: &Environment) -> ReactiveFunction`
- **Wire into pipeline.rs**
- **Test**: `bash compiler/scripts/test-rust-port.sh BuildReactiveFunction`

### Phase 3 — Validation Passes

- `assert_well_formed_break_targets` (~30 lines) — checks break/continue targets exist
- `assert_scope_instructions_within_scopes` (~80 lines) — validates scope ranges contain instructions

### Phase 4 — Simple Transforms (pipeline order)

1. `prune_unused_labels` (~50 lines) — removes unnecessary labels emitted by BuildReactiveFunction
2. `prune_non_reactive_dependencies` (~40 lines) — removes non-reactive deps from scopes
3. `prune_unused_scopes` (~60 lines) — converts scopes without outputs to pruned-scopes
4. `prune_always_invalidating_scopes` (~80 lines) — removes always-invalidating scopes
5. `prune_unused_lvalues` (~70 lines) — nulls out unused lvalues
6. `stabilize_block_ids` (~60 lines) — renumbers block IDs for stable output

### Phase 5 — Complex Transforms (pipeline order)

1. `prune_non_escaping_scopes` (~500 lines) — most complex reactive pass, removes scopes for non-escaping values
2. `merge_reactive_scopes_that_invalidate_together` (~400 lines) — merges adjacent scopes with same deps
3. `propagate_early_returns` (~200 lines) — handles early returns inside reactive scopes
4. `promote_used_temporaries` (~400 lines) — promotes temporaries to named variables
5. `extract_scope_declarations_from_destructuring` (~150 lines) — handles destructuring in scope declarations
6. `rename_variables` (~200 lines) — renames variables for output, returns `HashSet<String>`
7. `prune_hoisted_contexts` (~100 lines) — removes hoisted context declarations

### Phase 6 — Codegen (deferred, separate plan)

- `codegen_function` (~2000+ lines) — converts ReactiveFunction to CodegenFunction (Babel AST)
- Depends on Babel AST output types being available in Rust
- Will be planned separately

## 6. Pass Signatures

```rust
// Construction:
pub fn build_reactive_function(hir: &HirFunction, env: &Environment) -> ReactiveFunction;

// Debug printing:
pub fn debug_reactive_function(func: &ReactiveFunction, env: &Environment) -> String;

// Validation (read-only):
pub fn assert_well_formed_break_targets(func: &ReactiveFunction) -> Result<(), CompilerDiagnostic>;
pub fn assert_scope_instructions_within_scopes(func: &ReactiveFunction, env: &Environment) -> Result<(), CompilerDiagnostic>;

// Transforms (no env needed):
pub fn prune_unused_labels(func: &mut ReactiveFunction);
pub fn stabilize_block_ids(func: &mut ReactiveFunction);

// Transforms (read env for scope/identifier data):
pub fn prune_non_escaping_scopes(func: &mut ReactiveFunction, env: &Environment);
pub fn prune_non_reactive_dependencies(func: &mut ReactiveFunction, env: &Environment);
pub fn prune_unused_scopes(func: &mut ReactiveFunction, env: &Environment);
pub fn prune_always_invalidating_scopes(func: &mut ReactiveFunction, env: &Environment);
pub fn prune_unused_lvalues(func: &mut ReactiveFunction, env: &Environment);
pub fn promote_used_temporaries(func: &mut ReactiveFunction, env: &Environment);
pub fn prune_hoisted_contexts(func: &mut ReactiveFunction, env: &Environment);

// Transforms (mutate env — create temporaries, modify scope data):
pub fn merge_reactive_scopes_that_invalidate_together(func: &mut ReactiveFunction, env: &mut Environment);
pub fn propagate_early_returns(func: &mut ReactiveFunction, env: &mut Environment);
pub fn rename_variables(func: &mut ReactiveFunction, env: &mut Environment) -> HashSet<String>;
pub fn extract_scope_declarations_from_destructuring(func: &mut ReactiveFunction, env: &mut Environment);

// Validation (optional, gated on config):
pub fn validate_preserved_manual_memoization(func: &ReactiveFunction, env: &Environment) -> Result<(), CompilerDiagnostic>;
```

## 7. Visitor/Transform Framework

Use closure-based traversal helpers and direct recursion, matching the existing Rust codebase style (standalone functions, not trait hierarchies).

```rust
/// Read-only traversal of all statements in a block (recursive into nested blocks)
pub fn visit_reactive_block(block: &ReactiveBlock, visitor: &mut impl FnMut(&ReactiveStatement));

/// Mutating traversal with drain-and-rebuild pattern
pub fn transform_reactive_block(
    block: &mut ReactiveBlock,
    transform: &mut impl FnMut(ReactiveStatement) -> TransformResult,
);

pub enum TransformResult {
    Keep(ReactiveStatement),
    Remove,
    Replace(ReactiveStatement),
    ReplaceMany(Vec<ReactiveStatement>),
}

/// Iterate over all Place operands in a ReactiveValue
pub fn each_reactive_value_operand(value: &ReactiveValue) -> impl Iterator<Item = &Place>;

/// Map over all blocks contained in a ReactiveTerminal
pub fn map_terminal_blocks(terminal: &mut ReactiveTerminal, f: impl FnMut(&mut ReactiveBlock));
```

The drain-and-rebuild pattern for transforms:
1. `let stmts: Vec<_> = block.drain(..).collect();`
2. For each statement, call the transform closure
3. Collect results into a new Vec
4. Assign back to `*block`

This avoids borrow checker issues with in-place mutation while iterating.

## 8. Skill Updates

### `compiler/.claude/skills/compiler-orchestrator/SKILL.md`

Expand pass table rows #32-#49:

| # | Log Name | Kind | Notes |
|---|----------|------|-------|
| 32 | BuildReactiveFunction | reactive | |
| 33 | AssertWellFormedBreakTargets | debug | Validation |
| 34 | PruneUnusedLabels | reactive | |
| 35 | AssertScopeInstructionsWithinScopes | debug | Validation |
| 36 | PruneNonEscapingScopes | reactive | |
| 37 | PruneNonReactiveDependencies | reactive | |
| 38 | PruneUnusedScopes | reactive | |
| 39 | MergeReactiveScopesThatInvalidateTogether | reactive | |
| 40 | PruneAlwaysInvalidatingScopes | reactive | |
| 41 | PropagateEarlyReturns | reactive | |
| 42 | PruneUnusedLValues | reactive | |
| 43 | PromoteUsedTemporaries | reactive | |
| 44 | ExtractScopeDeclarationsFromDestructuring | reactive | |
| 45 | StabilizeBlockIds | reactive | |
| 46 | RenameVariables | reactive | |
| 47 | PruneHoistedContexts | reactive | |
| 48 | ValidatePreservedManualMemoization | debug | Conditional |
| 49 | Codegen | ast | |

Remove "BLOCKED" status from #32. Add crate mapping: `src/ReactiveScopes/` -> `react_compiler_reactive_scopes`.

### `compiler/.claude/skills/compiler-port/SKILL.md`

- **Step 0**: Remove the block on `kind: 'reactive'` passes (currently says "report that test-rust-port only supports `hir` kind passes currently and stop")
- **Step 1**: Add `src/ReactiveScopes/` -> `react_compiler_reactive_scopes` to the TS-to-Rust crate mapping table
- **Step 2**: Add reactive types file to context gathering list

### `compiler/.claude/agents/port-pass.md`

- Add note that reactive passes take `&mut ReactiveFunction` + `&Environment`/`&mut Environment` (not `&mut HirFunction`)
- Test command remains: `bash compiler/scripts/test-rust-port.sh <PassName>`

## 9. Key Files

| File | Action |
|------|--------|
| `compiler/crates/react_compiler_hir/src/reactive.rs` | Create: all reactive types |
| `compiler/crates/react_compiler_hir/src/lib.rs` | Edit: `pub mod reactive; pub use reactive::*;` |
| `compiler/crates/react_compiler_reactive_scopes/` | Create: new crate |
| `compiler/crates/Cargo.toml` (workspace) | Edit: add member |
| `compiler/crates/react_compiler/Cargo.toml` | Edit: add dependency |
| `compiler/crates/react_compiler/src/debug_print.rs` | Edit: extract shared helpers as `pub` |
| `compiler/crates/react_compiler/src/entrypoint/pipeline.rs` | Edit: wire reactive passes |
| `compiler/packages/.../src/HIR/DebugPrintReactiveFunction.ts` | Create: verbose debug printer |
| `compiler/packages/.../src/HIR/index.ts` | Edit: export |
| `compiler/scripts/test-rust-port.ts` | Edit: handle `kind: 'reactive'` |
| `compiler/.claude/skills/compiler-orchestrator/SKILL.md` | Edit: expand pass table |
| `compiler/.claude/skills/compiler-port/SKILL.md` | Edit: remove reactive block, add crate mapping |
| `compiler/.claude/agents/port-pass.md` | Edit: add reactive pass patterns |

## 10. TS Source Files Reference

| Pass | TS Source |
|------|-----------|
| BuildReactiveFunction | `src/ReactiveScopes/BuildReactiveFunction.ts` |
| AssertWellFormedBreakTargets | `src/ReactiveScopes/AssertWellFormedBreakTargets.ts` |
| PruneUnusedLabels | `src/ReactiveScopes/PruneUnusedLabels.ts` |
| AssertScopeInstructionsWithinScopes | `src/ReactiveScopes/AssertScopeInstructionsWithinScopes.ts` |
| PruneNonEscapingScopes | `src/ReactiveScopes/PruneNonEscapingScopes.ts` |
| PruneNonReactiveDependencies | `src/ReactiveScopes/PruneNonReactiveDependencies.ts` |
| PruneUnusedScopes | `src/ReactiveScopes/PruneUnusedScopes.ts` |
| MergeReactiveScopesThatInvalidateTogether | `src/ReactiveScopes/MergeReactiveScopesThatInvalidateTogether.ts` |
| PruneAlwaysInvalidatingScopes | `src/ReactiveScopes/PruneAlwaysInvalidatingScopes.ts` |
| PropagateEarlyReturns | `src/ReactiveScopes/PropagateEarlyReturns.ts` |
| PruneUnusedLValues | `src/ReactiveScopes/PruneTemporaryLValues.ts` |
| PromoteUsedTemporaries | `src/ReactiveScopes/PromoteUsedTemporaries.ts` |
| ExtractScopeDeclarationsFromDestructuring | `src/ReactiveScopes/ExtractScopeDeclarationsFromDestructuring.ts` |
| StabilizeBlockIds | `src/ReactiveScopes/StabilizeBlockIds.ts` |
| RenameVariables | `src/ReactiveScopes/RenameVariables.ts` |
| PruneHoistedContexts | `src/ReactiveScopes/PruneHoistedContexts.ts` |
| ValidatePreservedManualMemoization | `src/Validation/ValidatePreservedManualMemoization.ts` |
| Visitors/Transform | `src/ReactiveScopes/visitors.ts` |
| PrintReactiveFunction | `src/ReactiveScopes/PrintReactiveFunction.ts` |
| CodegenReactiveFunction | `src/ReactiveScopes/CodegenReactiveFunction.ts` |
