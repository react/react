# Rust Port Step 4: BuildHIR / HIR Lowering

## Goal

Port `BuildHIR.ts` (~4555 lines) and `HIRBuilder.ts` (~955 lines) into Rust equivalents in `compiler/crates/react_compiler_lowering/`. This is the first major compiler pass — it converts a Babel AST + scope info into the HIR control-flow graph representation.

The Rust port should be structurally as close to the TypeScript as possible: viewing the TS and Rust side by side, the logic should look, read, and feel similar while working naturally in Rust.

**Current status**: M1-M13 fully implemented. All statement types, expression types, destructuring, function expressions, JSX, switch/try-catch, for-of/in, optional chaining, and recursive lowering are complete. No `todo!()` stubs remain. `cargo check` passes. Remaining work: test against fixtures and fix divergences from TypeScript output.

**Known issues to fix:**
- All collection types must use `IndexMap`/`IndexSet` (from the `indexmap` crate), not `BTreeMap`/`BTreeSet`/`HashMap`/`HashSet`. This is critical for `HIR.blocks` where `BTreeMap` destroys RPO insertion ordering.
- Functions `lower_function`, `lower_function_to_value`, `gather_captured_context`, `lower_object_property_key`, `lower_type` take `&Expression`. The AST crate uses `Expression` for keys and doesn't have standalone `Function`/`ObjectPropertyKey`/`TypeAnnotation` types, so `&Expression` is correct for the current AST structure. When these functions are implemented, they should pattern-match on the specific expression variants internally.
- `VariableBinding::Identifier.binding_kind` is `String` — must be a `BindingKind` enum.
- `HirBuilder` is missing `component_scope: ScopeId` field (needed for `gather_captured_context` in M9).
- `build_temporary_place` helper is missing (listed in M4).
- `mark_predecessors` fallthrough handling: VERIFIED — matches TS `eachTerminalSuccessor` (does not include fallthroughs, correct).
- `GotoVariant::Break` usage: VERIFIED — matches TS for both `remove_unnecessary_try_catch` and `remove_dead_do_while_statements`.

---

## Crate Layout

```
compiler/crates/
  react_compiler_lowering/
    Cargo.toml
    src/
      lib.rs              # pub fn lower() entry point
      build_hir.rs        # lowerStatement, lowerExpression, lowerAssignment, etc.
      hir_builder.rs      # HIRBuilder struct
  react_compiler_hir/
    Cargo.toml
    src/
      lib.rs              # HIR types: HirFunction, BasicBlock, Instruction, Terminal, Place, etc.
      environment.rs      # Environment struct (arenas, counters, config)
  react_compiler_diagnostics/
    Cargo.toml
    src/
      lib.rs              # CompilerError, CompilerDiagnostic, ErrorCategory, etc.
```

### Dependencies

```toml
# react_compiler_lowering/Cargo.toml
[dependencies]
react_compiler_ast = { path = "../react_compiler_ast" }
react_compiler_hir = { path = "../react_compiler_hir" }
react_compiler_diagnostics = { path = "../react_compiler_diagnostics" }
```

---

## Key Design Decisions

### 1. No NodePath — Work Directly with AST Structs + ScopeInfo

The TypeScript `lower()` takes a `NodePath<t.Function>` and uses Babel's traversal API (`path.get()`, `path.scope.getBinding()`, etc.) extensively. The Rust port works with deserialized `react_compiler_ast` structs and the `ScopeInfo` from step 2.

**TypeScript pattern:**
```typescript
function lowerStatement(builder: HIRBuilder, stmtPath: NodePath<t.Statement>) {
  switch (stmtPath.type) {
    case 'IfStatement': {
      const stmt = stmtPath as NodePath<t.IfStatement>;
      const test = lowerExpressionToTemporary(builder, stmt.get('test'));
      ...
    }
  }
}
```

**Rust equivalent:**
```rust
fn lower_statement(builder: &mut HirBuilder, stmt: &ast::Statement) {
    match stmt {
        ast::Statement::IfStatement(stmt) => {
            let test = lower_expression_to_temporary(builder, &stmt.test);
            ...
        }
    }
}
```

The mapping is direct: `stmtPath.type` switch becomes `match stmt`, `stmt.get('test')` becomes `&stmt.test`, type narrowing via `as NodePath<T>` becomes Rust's `match` arm binding.

### 2. Binding Resolution via ScopeInfo

The TypeScript `resolveIdentifier()` and `resolveBinding()` methods use Babel's scope API (`path.scope.getBinding()`, `babelBinding.scope`, `babelBinding.path.isImportSpecifier()`, etc.). The Rust port replaces all of this with `ScopeInfo` lookups.

**TypeScript** (`HIRBuilder.resolveIdentifier()`):
```typescript
const babelBinding = path.scope.getBinding(originalName);
if (babelBinding === outerBinding) {
  if (path.isImportDefaultSpecifier()) { ... }
}
const resolvedBinding = this.resolveBinding(babelBinding.identifier);
```

**Rust equivalent:**
```rust
fn resolve_identifier(&mut self, name: &str, start_offset: u32) -> VariableBinding {
    // Look up via ScopeInfo instead of Babel's scope API
    let binding_id = self.scope_info.resolve_reference(start_offset);
    match binding_id {
        None => VariableBinding::Global { name: name.to_string() },
        Some(binding) => {
            if binding.scope == self.scope_info.program_scope {
                // Module-level binding — check import info
                match &binding.import {
                    Some(import) => match import.kind {
                        ImportBindingKind::Default => VariableBinding::ImportDefault { ... },
                        ImportBindingKind::Named => VariableBinding::ImportSpecifier { ... },
                        ImportBindingKind::Namespace => VariableBinding::ImportNamespace { ... },
                    },
                    None => VariableBinding::ModuleLocal { name: name.to_string() },
                }
            } else {
                let identifier = self.resolve_binding(name, binding_id.unwrap());
                VariableBinding::Identifier { identifier, binding_kind: BindingKind::from(&binding.kind) }
            }
        }
    }
}
```

Key differences:
- **`resolveBinding()` keying**: TypeScript uses Babel node reference identity (`mapping.node === node`) to distinguish same-named variables in different scopes. Rust uses `BindingId` from `ScopeInfo` — the map becomes `IndexMap<BindingId, IdentifierId>` instead of `Map<string, {node, identifier}>`. This is simpler and more correct.
- **`isContextIdentifier()`**: TypeScript checks `env.isContextIdentifier(binding.identifier)`. Rust checks whether the binding's scope is an ancestor of the current function's scope but not the program scope — this is a `ScopeInfo` query.
- **`gatherCapturedContext()`**: TypeScript traverses the function with Babel's traverser to find free variable references. Rust walks the AST directly using `ScopeInfo.reference_to_binding` to identify references that resolve to bindings in ancestor scopes.

### 3. HIRBuilder Struct

The `HIRBuilder` class maps to a Rust struct with `&mut self` methods. The closure-based APIs (`enter()`, `loop()`, `label()`, `switch()`) translate to methods that take `impl FnOnce(&mut Self) -> T`.

```rust
pub struct HirBuilder<'a> {
    completed: IndexMap<BlockId, BasicBlock>,
    current: WipBlock,
    entry: BlockId,
    scopes: Vec<Scope>,
    context: IndexMap<BindingId, Option<SourceLocation>>,
    bindings: IndexMap<BindingId, IdentifierId>,
    used_names: IndexMap<String, BindingId>,
    instruction_table: Vec<Instruction>,
    function_scope: ScopeId,
    component_scope: ScopeId,  // outermost component/hook scope, for gather_captured_context
    env: &'a mut Environment,
    scope_info: &'a ScopeInfo,
    exception_handler_stack: Vec<BlockId>,
    fbt_depth: u32,
}
```

**Closure patterns**: The TypeScript `enter()` method creates a new block, sets it as current, runs a closure, then restores the previous block. In Rust:

```rust
impl<'a> HirBuilder<'a> {
    fn enter(&mut self, kind: BlockKind, f: impl FnOnce(&mut Self, BlockId) -> Terminal) -> BlockId {
        let wip = self.reserve(kind);
        let wip_id = wip.id;
        self.enter_reserved(wip, |this| f(this, wip_id));
        wip_id
    }

    fn enter_reserved(&mut self, wip: WipBlock, f: impl FnOnce(&mut Self) -> Terminal) {
        let prev = std::mem::replace(&mut self.current, wip);
        let terminal = f(self);
        let completed = std::mem::replace(&mut self.current, prev);
        self.completed.insert(completed.id, BasicBlock {
            kind: completed.kind,
            id: completed.id,
            instructions: completed.instructions,
            terminal,
            preds: IndexSet::new(),
            phis: Vec::new(),
        });
    }

    fn loop_scope<T>(
        &mut self,
        label: Option<String>,
        continue_block: BlockId,
        break_block: BlockId,
        f: impl FnOnce(&mut Self) -> T,
    ) -> T {
        self.scopes.push(Scope::Loop { label, continue_block, break_block });
        let value = f(self);
        self.scopes.pop();
        value
    }
}
```

**Variable capture across closures**: TypeScript frequently assigns variables inside `enter()` closures that are read after:
```typescript
let callee: Place | null = null;
builder.enter('block', () => {
  callee = lowerExpressionToTemporary(builder, ...);
  return { kind: 'goto', ... };
});
// callee is used here
```

In Rust, this pattern is handled by returning values from the closure:
```rust
let (block_id, callee) = {
    let block_id = builder.enter('block', |builder, _block_id| {
        // We can't easily return extra values from enter() since it expects Terminal
        // Instead, compute callee before/after enter(), or restructure
        ...
    });
    // Alternative: compute the value and store it on builder temporarily
};
```

For cases where this is awkward, use a temporary field on the builder or restructure the code to compute the value outside the closure. The specific approach depends on the case — see the incremental implementation milestones for details.

### 4. Source Locations

TypeScript accesses `node.loc` directly. Rust accesses `node.base.loc` (through the `BaseNode` flattened into each AST struct). Helper:

```rust
fn loc_from_node(base: &BaseNode) -> SourceLocation {
    base.loc.as_ref().map(|l| hir::SourceLocation::from(l)).unwrap_or(GENERATED_SOURCE)
}
```

### 5. Error Handling

Following the port notes:
- `CompilerError.invariant(cond, ...)` → `if !cond { panic!(...) }` or dedicated `compiler_invariant!` macro
- `CompilerError.throwTodo(...)` → `return Err(CompilerDiagnostic::todo(...))`
- `builder.recordError(...)` → `builder.record_error(...)` (accumulates on Environment)
- Non-null assertions (`!`) → `.unwrap()` or `.expect("...")`

The `lower()` function returns `Result<HirFunction, CompilerError>` for invariant/thrown errors, while accumulated errors go to `env.errors`.

### 6. `todo!()` Strategy for Incremental Implementation

BuildHIR is too large (4555 lines) for a single implementation pass. Use Rust's `todo!()` macro to stub unimplemented branches:

```rust
fn lower_statement(builder: &mut HirBuilder, stmt: &ast::Statement) {
    match stmt {
        ast::Statement::IfStatement(s) => lower_if_statement(builder, s),
        ast::Statement::ReturnStatement(s) => lower_return_statement(builder, s),
        ast::Statement::BlockStatement(s) => lower_block_statement(builder, s),
        // Stubbed — will be filled in later milestones
        ast::Statement::ForStatement(_) => todo!("lower ForStatement"),
        ast::Statement::WhileStatement(_) => todo!("lower WhileStatement"),
        ast::Statement::SwitchStatement(_) => todo!("lower SwitchStatement"),
        ast::Statement::TryStatement(_) => todo!("lower TryStatement"),
        // ... etc
    }
}
```

This "fog of war" approach allows:
1. The code to compile at every step
2. Tests to run for fixtures that only use implemented features
3. Clear visibility into what remains
4. Agents to pick up individual `todo!()` arms and implement them

---

## Structural Mapping: TypeScript → Rust

### Top-Level Functions

| TypeScript (BuildHIR.ts) | Rust (build_hir.rs) | Notes |
|---|---|---|
| `lower(func, env, bindings, capturedRefs)` | `pub fn lower(ast: &ast::File, scope_info: &ScopeInfo, env: &mut Environment) -> Result<HirFunction, CompilerError>` | Entry point. Takes the full File (extracts the function internally) |
| `lowerStatement(builder, stmtPath, label)` | `fn lower_statement(builder: &mut HirBuilder, stmt: &ast::Statement, label: Option<&str>)` | ~30 match arms |
| `lowerExpression(builder, exprPath)` | `fn lower_expression(builder: &mut HirBuilder, expr: &ast::Expression) -> InstructionValue` | ~40 match arms |
| `lowerExpressionToTemporary(builder, exprPath)` | `fn lower_expression_to_temporary(builder: &mut HirBuilder, expr: &ast::Expression) -> Place` | |
| `lowerValueToTemporary(builder, value)` | `fn lower_value_to_temporary(builder: &mut HirBuilder, value: InstructionValue) -> Place` | |
| `lowerAssignment(builder, loc, kind, target, value, assignmentStyle)` | `fn lower_assignment(builder: &mut HirBuilder, ...)` | Handles destructuring patterns |
| `lowerIdentifier(builder, exprPath)` | `fn lower_identifier(builder: &mut HirBuilder, name: &str, start: u32, loc: SourceLocation) -> Place` | |
| `lowerMemberExpression(builder, exprPath)` | `fn lower_member_expression(builder: &mut HirBuilder, expr: &ast::MemberExpression) -> InstructionValue` | |
| `lowerOptionalMemberExpression(builder, exprPath)` | `fn lower_optional_member_expression(builder: &mut HirBuilder, expr: &ast::OptionalMemberExpression) -> InstructionValue` | |
| `lowerOptionalCallExpression(builder, exprPath)` | `fn lower_optional_call_expression(builder: &mut HirBuilder, expr: &ast::OptionalCallExpression) -> InstructionValue` | |
| `lowerArguments(builder, args, isDev)` | `fn lower_arguments(builder: &mut HirBuilder, args: &[ast::Expression], is_dev: bool) -> Vec<PlaceOrSpread>` | |
| `lowerFunctionToValue(builder, expr)` | `fn lower_function_to_value(builder: &mut HirBuilder, expr: &ast::Function) -> InstructionValue` | |
| `lowerFunction(builder, expr)` | `fn lower_function(builder: &mut HirBuilder, expr: &ast::Function) -> LoweredFunction` | Recursive `lower()` call. Returns `LoweredFunction` (not `FunctionId`) |
| `lowerJsxElementName(builder, name)` | `fn lower_jsx_element_name(builder: &mut HirBuilder, name: &ast::JSXElementName) -> JsxTag` | |
| `lowerJsxElement(builder, child)` | `fn lower_jsx_element(builder: &mut HirBuilder, child: &ast::JSXChild) -> Option<Place>` | |
| `lowerObjectMethod(builder, property)` | `fn lower_object_method(builder: &mut HirBuilder, method: &ast::ObjectMethod) -> ObjectProperty` | |
| `lowerObjectPropertyKey(builder, key)` | `fn lower_object_property_key(builder: &mut HirBuilder, key: &ast::ObjectPropertyKey) -> ObjectPropertyKey` | |
| `lowerReorderableExpression(builder, expr)` | `fn lower_reorderable_expression(builder: &mut HirBuilder, expr: &ast::Expression) -> Place` | |
| `isReorderableExpression(builder, expr)` | `fn is_reorderable_expression(builder: &HirBuilder, expr: &ast::Expression) -> bool` | |
| `lowerType(node)` | `fn lower_type(node: &ast::TypeAnnotation) -> Type` | |
| `gatherCapturedContext(fn, componentScope)` | `fn gather_captured_context(func: &ast::Function, scope_info: &ScopeInfo, parent_scope: ScopeId) -> IndexMap<BindingId, Option<SourceLocation>>` | AST walk replaces Babel traverser |
| `captureScopes({from, to})` | `fn capture_scopes(scope_info: &ScopeInfo, from: ScopeId, to: ScopeId) -> IndexSet<ScopeId>` | |

### HIRBuilder Methods

| TypeScript (HIRBuilder.ts) | Rust (hir_builder.rs) | Notes |
|---|---|---|
| `constructor(env, options?)` | `HirBuilder::new(env, scope_info, function_scope, bindings, context, entry_block_kind)` | |
| `push(instruction)` | `builder.push(instruction)` | |
| `terminate(terminal, nextBlockKind)` | `builder.terminate(terminal, next_block_kind)` | |
| `terminateWithContinuation(terminal, continuation)` | `builder.terminate_with_continuation(terminal, continuation)` | |
| `reserve(kind)` | `builder.reserve(kind)` | Returns `WipBlock` |
| `complete(block, terminal)` | `builder.complete(block, terminal)` | |
| `enter(kind, fn)` | `builder.enter(kind, \|b, id\| { ... })` | Closure takes `&mut Self` |
| `enterReserved(wip, fn)` | `builder.enter_reserved(wip, \|b\| { ... })` | |
| `enterTryCatch(handler, fn)` | `builder.enter_try_catch(handler, \|b\| { ... })` | |
| `loop(label, continue, break, fn)` | `builder.loop_scope(label, continue_block, break_block, \|b\| { ... })` | |
| `label(label, break, fn)` | `builder.label_scope(label, break_block, \|b\| { ... })` | |
| `switch(label, break, fn)` | `builder.switch_scope(label, break_block, \|b\| { ... })` | |
| `lookupBreak(label)` | `builder.lookup_break(label)` | |
| `lookupContinue(label)` | `builder.lookup_continue(label)` | |
| `resolveIdentifier(path)` | `builder.resolve_identifier(name, start_offset)` | Uses ScopeInfo |
| `resolveBinding(node)` | `builder.resolve_binding(name, binding_id)` | Keyed by BindingId |
| `isContextIdentifier(path)` | `builder.is_context_identifier(name, start_offset)` | Uses ScopeInfo |
| `makeTemporary(loc)` | `builder.make_temporary(loc)` | |
| `build()` | `builder.build()` | Returns `(HIR, Vec<Instruction>)` — the HIR plus the flat instruction table |
| `recordError(error)` | `builder.record_error(error)` | |

### Post-Build Helpers (HIRBuilder.ts)

These helper functions in HIRBuilder.ts run after `build()` and clean up the CFG:

| TypeScript | Rust | Notes |
|---|---|---|
| `getReversePostorderedBlocks(func)` | `get_reverse_postordered_blocks(hir)` | RPO sort + unreachable removal |
| `removeUnreachableForUpdates(fn)` | `remove_unreachable_for_updates(hir)` | |
| `removeDeadDoWhileStatements(func)` | `remove_dead_do_while_statements(hir)` | |
| `removeUnnecessaryTryCatch(fn)` | `remove_unnecessary_try_catch(hir)` | |
| `markInstructionIds(func)` | `mark_instruction_ids(hir)` | Assigns EvaluationOrder |
| `markPredecessors(func)` | `mark_predecessors(hir)` | Must include fallthrough blocks — verify `each_terminal_successor` matches TS `eachTerminalSuccessor` |
| `createTemporaryPlace(env, loc)` | `create_temporary_place(env, loc)` | |

**Implementation notes for post-build helpers:**
- `remove_unnecessary_try_catch` and `remove_dead_do_while_statements`: Verify that the `GotoVariant` used when replacing terminals matches the TS equivalent. Currently uses `GotoVariant::Break` — confirm this is correct.
- `mark_predecessors`: The `each_terminal_successor` function must visit fallthrough blocks for terminals like `Try`, not just direct successors. Compare against TS `eachTerminalSuccessor` behavior.

---

## Statement Lowering: Match Arm Inventory

The `lowerStatement` function has ~30 match arms. Grouped by complexity:

### Tier 1 — Trivial (1-10 lines each)
- `EmptyStatement` — no-op
- `DebuggerStatement` — single `Debugger` instruction
- `ExpressionStatement` — delegate to `lower_expression_to_temporary`
- `BreakStatement` — `builder.lookup_break()` + goto terminal
- `ContinueStatement` — `builder.lookup_continue()` + goto terminal
- `ThrowStatement` — lower expression + throw terminal

### Tier 2 — Simple control flow (10-30 lines each)
- `ReturnStatement` — lower expression + return terminal
- `BlockStatement` — iterate body statements
- `IfStatement` — reserve blocks, enter consequent/alternate, branch terminal
- `WhileStatement` — test block + body block + loop scope
- `LabeledStatement` — delegate with label, or create label scope

### Tier 3 — Complex control flow (30-100 lines each)
- `ForStatement` — init/test/update/body blocks, loop scope
- `ForOfStatement` — iterator protocol (GetIterator, IteratorNext, etc.)
- `ForInStatement` — similar to ForOf
- `DoWhileStatement` — body-first loop
- `SwitchStatement` — case discrimination with fall-through
- `TryStatement` — try/catch/finally blocks with exception handler stack

### Tier 4 — Variable declarations and assignments (30-80 lines)
- `VariableDeclaration` — iterate declarators, handle destructuring
- `FunctionDeclaration` — hoist function, lower body

### Tier 5 — Pass-through / error (1-10 lines each)
- TypeScript/Flow declarations — `todo!()` or skip
- Import/Export declarations — error (shouldn't appear in function body)
- `WithStatement` — error (unsupported)
- `ClassDeclaration` — lower class expression
- `EnumDeclaration` / `TSEnumDeclaration` — error

---

## Expression Lowering: Match Arm Inventory

The `lowerExpression` function has ~40 match arms. Grouped by complexity:

### Tier 1 — Literals and simple values (1-10 lines each)
- `NullLiteral`, `BooleanLiteral`, `NumericLiteral`, `StringLiteral` — `Primitive` instruction
- `RegExpLiteral` — `RegExpLiteral` instruction
- `Identifier` — delegate to `lower_identifier`
- `MetaProperty` — `LoadGlobal` for `import.meta`
- `TSNonNullExpression`, `TSInstantiationExpression` — unwrap inner expression
- `TypeCastExpression`, `TSAsExpression`, `TSSatisfiesExpression` — unwrap inner expression

### Tier 2 — Operators (10-30 lines each)
- `BinaryExpression` — lower operands + `BinaryExpression` instruction
- `UnaryExpression` — lower operand + `UnaryExpression` instruction
- `UpdateExpression` — read + increment + store (prefix vs postfix)
- `SequenceExpression` — lower all expressions, return last

### Tier 3 — Object/Array construction (20-50 lines each)
- `ObjectExpression` — properties, spread, computed keys
- `ArrayExpression` — elements with holes and spreads
- `TemplateLiteral` — quasis + expressions
- `TaggedTemplateExpression` — tag + template

### Tier 4 — Calls and member access (20-50 lines each)
- `CallExpression` — callee + arguments + `CallExpression`/`MethodCall` instruction
- `NewExpression` — similar to CallExpression
- `MemberExpression` — object + property + `PropertyLoad`/`ComputedLoad`
- `OptionalCallExpression` — optional chain with test blocks
- `OptionalMemberExpression` — optional chain with test blocks

### Tier 5 — Control flow expressions (30-80 lines each)
- `ConditionalExpression` — if-like CFG with value blocks
- `LogicalExpression` — short-circuit evaluation with blocks
- `AssignmentExpression` — delegates to `lower_assignment` (destructuring)

### Tier 6 — Complex (50-150 lines each)
- `JSXElement` — tag + props + children + fbt handling
- `JSXFragment` — children only
- `ArrowFunctionExpression` / `FunctionExpression` — recursive `lower_function`
- `AwaitExpression` — lower value + await instruction

---

## Assignment Lowering

`lowerAssignment` (~500 lines in BuildHIR.ts) handles destructuring and is the most complex single function after the statement/expression switches. It processes:

### Match arms by target type:
- **`Identifier`** — `StoreLocal` instruction (with const/let/reassign distinction)
- **`MemberExpression`** — `PropertyStore` / `ComputedStore` instruction
- **`ArrayPattern`** — emit `Destructure` with `ArrayPattern` containing items, holes, rest elements, and default values
- **`ObjectPattern`** — emit `Destructure` with `ObjectPattern` containing properties, computed keys, rest elements, and default values
- **`AssignmentPattern`** — default value handling: lower the default, emit a conditional assignment

### Rust approach:
The destructuring patterns map directly — the AST struct fields (`elements`, `properties`, `rest`) correspond to the Babel API calls. The main difference is accessing nested patterns through struct fields instead of `path.get()`.

---

## Recursive Lowering for Nested Functions

`lowerFunction()` calls `lower()` recursively for function expressions, arrow functions, and object methods. Key considerations for Rust:

1. **Shared Environment**: Parent and child share `&mut Environment`. This works because the recursive call completes before the parent continues.

2. **Shared Bindings**: The parent's `bindings` map is passed to the child so inner functions can resolve references to outer variables. In Rust, this is `&IndexMap<BindingId, IdentifierId>` — the parent's bindings are cloned or borrowed by the child.

3. **Context gathering**: `gatherCapturedContext()` walks the function's AST to find free variable references. In Rust, this walks the AST structs using `ScopeInfo` to identify references that resolve to bindings in ancestor scopes (between the function's scope and the component scope).

4. **Function arena storage**: The returned `HirFunction` is stored in `env.functions` (the function arena) and referenced by `FunctionId` in the `FunctionExpression` instruction value.

```rust
fn lower_function(builder: &mut HirBuilder, func: &ast::Function) -> LoweredFunction {
    let captured_context = gather_captured_context(func, builder.scope_info, builder.component_scope);
    let lowered = lower(func, builder.scope_info, builder.env, Some(&builder.bindings), captured_context)?;
    lowered
}
```

---

## Incremental Implementation Plan

### M1: Scaffold + Infrastructure

**Goal**: Crate structure compiles, `lower()` entry point exists, returns `todo!()`.

1. Create `compiler/crates/react_compiler_diagnostics/` with `CompilerDiagnostic`, `CompilerError`, `ErrorCategory`, `CompilerErrorDetail`, `CompilerSuggestionOperation`.

2. Create `compiler/crates/react_compiler_hir/` with core types:
   - ID newtypes: `BlockId`, `IdentifierId`, `InstructionId` (index into the flat instruction table), `EvaluationOrder` (sequential numbering assigned during `markInstructionIds()` — this was previously called `InstructionId` in the TypeScript compiler), `DeclarationId`, `ScopeId`, `FunctionId`, `TypeId`
   - `HirFunction`, `HIR`, `BasicBlock`, `WipBlock`, `BlockKind`
   - `Instruction`, `InstructionValue` (enum with all ~40 variants, each stubbed as `todo!()` for fields)
   - `Terminal` (enum with all variants)
   - `Place`, `Identifier`, `MutableRange`, `SourceLocation`
   - `Effect`, `InstructionKind`, `GotoVariant`, `BindingKind` (enum: `Var`, `Let`, `Const`, `Param`, `Using`, `AwaitUsing`, `CatchParam`, `ImplicitConst`)
   - `Environment` (counters, arenas, config, errors)
   - `FloatValue(u64)` — wrapper type for f64 values that need `Eq`/`Hash` (stores raw bits via `f64::to_bits()` for deterministic comparison)

3. Create `compiler/crates/react_compiler_lowering/` with:
   - `hir_builder.rs`: `HirBuilder` struct with all methods stubbed
   - `build_hir.rs`: `lower_statement()` and `lower_expression()` with all arms as `todo!()`
   - `lib.rs`: `pub fn lower()` that creates a builder and returns `todo!()`

4. Verify: `cargo check` passes.

### M2: HIRBuilder Core

**Goal**: HIRBuilder methods work — can create blocks, terminate them, build the CFG.

1. Implement `HirBuilder::new()`, `push()`, `terminate()`, `terminate_with_continuation()`, `reserve()`, `complete()`, `enter_reserved()`, `enter()`.

2. Implement scope methods: `loop_scope()`, `label_scope()`, `switch_scope()`, `lookup_break()`, `lookup_continue()`.

3. Implement `enter_try_catch()`, `resolve_throw_handler()`.

4. Implement `make_temporary()`, `record_error()`.

5. Implement `build()` including the post-build passes:
   - `get_reverse_postordered_blocks()`
   - `remove_unreachable_for_updates()`
   - `remove_dead_do_while_statements()`
   - `remove_unnecessary_try_catch()`
   - `mark_instruction_ids()`
   - `mark_predecessors()`

### M3: Binding Resolution

**Goal**: `resolve_identifier()` and `resolve_binding()` work with `ScopeInfo`.

1. Implement `resolve_binding()` — maps `BindingId` to `IdentifierId`, creating new identifiers on first encounter. Uses `IndexMap<BindingId, IdentifierId>` instead of the TypeScript `Map<string, {node, identifier}>`.

2. Implement `resolve_identifier()` — dispatches to Global, ImportDefault, ImportSpecifier, ImportNamespace, ModuleLocal, or Identifier based on `ScopeInfo` lookups.

3. Implement `is_context_identifier()` — checks if a reference resolves to a binding in an ancestor scope.

4. Implement `gather_captured_context()` — walks AST to find free variable references using `ScopeInfo`.

### M4: `lower()` Entry Point + Basic Statements

**Goal**: Can lower simple functions with `ReturnStatement`, `ExpressionStatement`, `BlockStatement`, `VariableDeclaration` (simple, non-destructuring).

1. Implement the `lower()` function body: parameter processing, body lowering, final return terminal, `builder.build()`.

2. Implement statement arms:
   - `ReturnStatement`
   - `ExpressionStatement`
   - `BlockStatement`
   - `EmptyStatement`
   - `VariableDeclaration` (simple `let x = expr` only, destructuring as `todo!()`)

3. Implement basic expression arms:
   - `Identifier` (via `lower_identifier`)
   - `NullLiteral`, `BooleanLiteral`, `NumericLiteral`, `StringLiteral`
   - `BinaryExpression`
   - `UnaryExpression`

4. Implement helpers: `lower_expression_to_temporary()`, `lower_value_to_temporary()`, `build_temporary_place()`.

5. **Test**: Run `test-rust-port.sh HIR` on simple fixtures.

### M5: Control Flow

**Goal**: Branches and loops work.

1. `IfStatement` — consequent/alternate blocks, branch terminal
2. `WhileStatement` — test/body blocks, loop scope
3. `ForStatement` — init/test/update/body blocks
4. `DoWhileStatement` — body-first loop pattern
5. `BreakStatement`, `ContinueStatement`
6. `LabeledStatement`

### M6: Expressions — Calls and Members

**Goal**: Function calls and property access work.

1. `CallExpression` — including method calls (callee is MemberExpression)
2. `NewExpression`
3. `MemberExpression` — PropertyLoad/ComputedLoad
4. `lower_arguments()` — spread handling
5. `SequenceExpression`

### M7: Expressions — Short-circuit and Ternary

**Goal**: Control-flow expressions produce correct CFG.

1. `ConditionalExpression` — if-like structure with value blocks
2. `LogicalExpression` — short-circuit `&&`, `||`, `??`
3. `AssignmentExpression` — simple identifier/member assignment (destructuring deferred)

### M8: Expressions — Remaining

**Goal**: All expression types handled.

1. `ObjectExpression` — properties, methods, computed, spread
2. `ArrayExpression` — elements, holes, spreads
3. `TemplateLiteral`, `TaggedTemplateExpression`
4. `UpdateExpression` — prefix/postfix increment/decrement
5. `RegExpLiteral`
6. `AwaitExpression`
7. `TypeCastExpression`, `TSAsExpression`, `TSSatisfiesExpression`, `TSNonNullExpression`, `TSInstantiationExpression`
8. `MetaProperty`

### M9: Function Expressions + Recursive Lowering

**Goal**: Nested functions work.

1. `ArrowFunctionExpression`, `FunctionExpression` — call `lower_function()`
2. `lower_function()` — recursive `lower()` with captured context
3. `gather_captured_context()` — AST walk for free variables
4. Function arena storage via `FunctionId`
5. `FunctionDeclaration` statement — hoisted function lowering

### M10: JSX

**Goal**: JSX elements and fragments lower correctly.

1. `JSXElement` — tag, props, children, fbt handling
2. `JSXFragment` — children
3. `lower_jsx_element_name()` — identifier, member expression, builtin tag dispatch
4. `lower_jsx_element()` — child lowering (text, expression, element, spread)
5. `lower_jsx_member_expression()`
6. `trimJsxText()` — whitespace normalization

### M11: Destructuring + Complex Assignments

**Goal**: Full destructuring support.

1. `lower_assignment()` for `ArrayPattern` — items, holes, rest, defaults
2. `lower_assignment()` for `ObjectPattern` — properties, computed keys, rest, defaults
3. `lower_assignment()` for `AssignmentPattern` — default values
4. `VariableDeclaration` with destructuring patterns
5. Param destructuring in `lower()` entry point

### M12: Switch + Try/Catch + Remaining

**Goal**: All statement types handled, complete coverage.

1. `SwitchStatement` — case discrimination, fall-through, break
2. `TryStatement` — try/catch/finally blocks, exception handler stack
3. `ForOfStatement` — iterator protocol
4. `ForInStatement` — for-in lowering
5. `WithStatement` — error
6. `ClassDeclaration` — class expression lowering
7. Type declarations — skip/pass-through
8. Import/Export declarations — error
9. `OptionalCallExpression`, `OptionalMemberExpression` — optional chaining
10. `lowerReorderableExpression()`, `isReorderableExpression()`

### M13: Polish + Full Test Coverage

**Goal**: All fixtures pass, no remaining `todo!()` in production paths.

1. Remove all remaining `todo!()` stubs — replace with proper errors for truly unsupported syntax
2. Run `test-rust-port.sh HIR` on all 1714 fixtures
3. Debug and fix any divergences from TypeScript output
4. Handle edge cases: error recovery, Babel bug workarounds (where applicable), fbt depth tracking

---

## Key Rust Patterns

### Pattern 1: Switch/Case → Match

Every `switch (stmtPath.type)` and `switch (exprPath.type)` becomes a `match` on the AST enum. Rust's exhaustive matching ensures no cases are missed (unlike TypeScript where the `default` arm might hide bugs).

### Pattern 2: `path.get('field')` → Direct Field Access

```typescript
// TypeScript
const test = stmt.get('test');
const body = stmt.get('body');
```
```rust
// Rust
let test = &stmt.test;
let body = &stmt.body;
```

### Pattern 3: Type Guards → Match Arms

```typescript
// TypeScript
if (param.isIdentifier()) { ... }
else if (param.isObjectPattern()) { ... }
```
```rust
// Rust
match param {
    ast::PatternLike::Identifier(id) => { ... }
    ast::PatternLike::ObjectPattern(pat) => { ... }
}
```

### Pattern 4: `hasNode()` → `Option` Checks

```typescript
// TypeScript
const alternate = stmt.get('alternate');
if (hasNode(alternate)) { ... }
```
```rust
// Rust
if let Some(alternate) = &stmt.alternate { ... }
```

### Pattern 5: Instruction Construction

```typescript
// TypeScript
builder.push({
    id: makeInstructionId(0),
    lvalue: { ...place },
    value: { kind: 'LoadGlobal', name, binding, loc },
    effects: null,
    loc: exprLoc,
});
```
```rust
// Rust
builder.push(Instruction {
    id: InstructionId(0), // renumbered by markInstructionIds
    lvalue: place.clone(),
    value: InstructionValue::LoadGlobal { name, binding, loc },
    effects: None,
    loc: expr_loc,
});
```

---

## Risks and Mitigations

### Risk 1: `gatherCapturedContext()` Without Babel Traverser
**Impact**: Medium. The TypeScript version uses `fn.traverse()` to find free variable references.
**Mitigation**: Write a manual AST walker that visits all `Identifier` nodes in a function body and checks `ScopeInfo.reference_to_binding` for each one. This is simpler than Babel's traverser because we don't need the full visitor infrastructure — just recursive pattern matching over AST node types.

### Risk 2: Variable Capture Across `enter()` Closures
**Impact**: Low-Medium. ~15-20 places in BuildHIR.ts assign variables inside `enter()` closures that are read outside.
**Mitigation**: Case-by-case restructuring. Options include: (a) returning the value from the closure via a tuple, (b) storing it on the builder temporarily, (c) restructuring to compute the value before/after the `enter()` call. Each instance is small and mechanical.

### Risk 3: `isReorderableExpression()` Recursive Analysis
**Impact**: Low. This function deeply analyzes expressions to determine reorderability.
**Mitigation**: Direct recursive pattern matching on AST structs — actually simpler in Rust than TypeScript because there's no NodePath overhead.

### Risk 4: Optional Chaining Lowering Complexity
**Impact**: Medium. `lowerOptionalCallExpression()` and `lowerOptionalMemberExpression()` (~250 lines combined) generate complex CFG structures with multiple blocks for null checks.
**Mitigation**: Port last (M12), after all simpler patterns are verified. The CFG generation logic maps directly — it's just verbose.

### Risk 5: fbt/fbs Special Handling
**Impact**: Low. The fbt handling in JSXElement lowering uses Babel's `path.traverse()` for counting nested fbt tags.
**Mitigation**: Replace with a simple recursive AST walk that counts `JSXNamespacedName` nodes matching the fbt tag name. The fbtDepth counter on the builder is trivial.
