# Rust Port: Architecture Guide

Reference for key data structures, patterns, and constraints in the Rust compiler port. See `rust-port-research.md` for detailed per-pass analysis and `rust-port-notes.md` for the original design decisions.

## Arenas and ID Types

All shared mutable data is stored in arenas on `Environment`, referenced by copyable ID types. This replaces JavaScript's shared object references.

| Arena | ID Type | Stored On | Replaces |
|-------|---------|-----------|----------|
| `identifiers: Vec<Identifier>` | `IdentifierId` | `Environment` | Shared `Identifier` object references across `Place` values |
| `scopes: Vec<ReactiveScope>` | `ScopeId` | `Environment` | Shared `ReactiveScope` references across identifiers |
| `functions: Vec<HIRFunction>` | `FunctionId` | `Environment` | Inline `HIRFunction` on `FunctionExpression`/`ObjectMethod` |
| `types: Vec<Type>` | `TypeId` | `Environment` | Inline `Type` on `Identifier` |

All ID types are `Copy + Clone + Hash + Eq + PartialEq` newtypes wrapping `u32`.

## Instructions and EvaluationOrder

- `HirFunction.instructions: Vec<Instruction>` — flat instruction table
- `BasicBlock.instructions: Vec<InstructionId>` — indices into the table above
- The old TypeScript `InstructionId` is renamed to `EvaluationOrder` — it represents evaluation order and appears on both instructions and terminals
- The new `InstructionId` is an index into `HirFunction.instructions`, giving passes a single copyable ID to reference any instruction

## Place is Clone, MutableRange is on Identifier/Scope

`Place` stores an `IdentifierId` (not a shared reference), making it small and cheap to clone. Mutation of `mutable_range` goes through the identifier arena:

```rust
env.identifiers[place.identifier].mutable_range.end = new_end;
```

After `InferReactiveScopeVariables`, an identifier's effective mutable range is its scope's range. Downstream passes access this through the scope arena:

```rust
let range = match env.identifiers[id].scope {
    Some(scope_id) => env.scopes[scope_id].range,
    None => env.identifiers[id].mutable_range,
};
```

## Function Arena and FunctionId

`FunctionExpression` and `ObjectMethod` instruction values store a `FunctionId` instead of an inline `HIRFunction`. Inner functions are accessed via the arena:

```rust
let inner = &env.functions[function_id];       // read
let inner = &mut env.functions[function_id];    // write
```

This makes `CreateFunction` aliasing effects store `FunctionId`, and function signature caches key by `FunctionId`.

## AliasingEffect

Effects own cloned `Place` values (cheap since `Place` contains `IdentifierId`). Key variants:

- `Apply` — clones the args `Vec<PlaceOrSpreadOrHole>` from the instruction value
- `CreateFunction` — stores `FunctionId` (not the `FunctionExpression` itself), plus cloned `captures: Vec<Place>`

Effect interning uses content hashing. The interned `EffectId` serves as both dedup key and allocation-site identity for abstract interpretation in `InferMutationAliasingEffects`.

## Environment: Separate from HirFunction

`HirFunction` does not store `env`. Passes receive `env: &mut Environment` as a separate parameter. Fields are flat (no sub-structs) to allow precise sliced borrows:

```rust
// Simultaneous borrow of different fields is fine:
let id = &env.identifiers[some_id];
let scope = &env.scopes[some_scope_id];
```

## Ordered Maps

Use `IndexMap`/`IndexSet` (from the `indexmap` crate) wherever the TypeScript uses `Map`/`Set` and iteration order matters. The primary case is `HIR.blocks: IndexMap<BlockId, BasicBlock>` which maintains reverse postorder.

## Side Maps

Side maps fall into four categories:

1. **ID-only maps** — `HashMap<IdType, T>` / `HashSet<IdType>`. No borrow issues. Most passes use this.
2. **Reference-identity maps** — TypeScript `Map<Identifier, T>` becomes `HashMap<IdentifierId, T>`. Similarly `DisjointSet<Identifier>` becomes `DisjointSet<IdentifierId>`, `DisjointSet<ReactiveScope>` becomes `DisjointSet<ScopeId>`.
3. **Instruction/value reference maps** — Store `InstructionId` or `FunctionId` instead of references. Access the actual data through the instruction table or function arena when needed.
4. **Scope reference sets with mutation** — Store `ScopeId` in sets. Mutate through the arena: `env.scopes[scope_id].range.start = new_start`.

When a pass needs to both iterate over data and mutate the HIR, use two-phase collect/apply: collect IDs or updates into a `Vec`, then apply mutations in a second loop.

## Error Handling

| TypeScript Pattern | Rust Approach |
|---|---|
| Non-null assertion (`!`) | `.unwrap()` (panic) |
| `CompilerError.invariant()`, `CompilerError.throwTodo()`, `throw ...` | Return `Err(CompilerDiagnostic)` via `Result` |
| `env.recordError()` or `pushDiagnostic()` with an invariant error | Return `Err(CompilerDiagnostic)` |
| `env.recordError()` or `pushDiagnostic()` with a NON invariant error | Keep as-is — accumulate on `Environment` |

Preserve full error details: reason, description, location, suggestions, category. 

## JS→Rust Boundary

The JS side serializes the Babel AST and Babel's scope information (scope tree, bindings, reference-to-binding map) to Rust. Keep this serialization thin: only send the core data structures that Babel already computed during parsing. Any derived analysis — identifier source locations, JSX classification, captured variables, etc. — should be computed on the Rust side by walking the AST. See `scope.ts`.

## Pipeline and Pass Structure

```rust
fn compile(ast: Ast, scope: Scope, env: &mut Environment)
    -> Result<CompileResult, CompilerDiagnostic>
{
    let mut hir = lower(ast, scope, env)?;
    some_pass(&mut hir, env)?;
    // ...
    let ast = codegen(...)?;

    if env.has_errors() {
        Ok(CompileResult::Failure(env.take_errors()))
    } else {
        Ok(CompileResult::Success(ast))
    }
}
```

Pass signatures follow these patterns:

```rust
// Most passes: mutable HIR + mutable environment
fn pass(func: &mut HirFunction, env: &mut Environment) -> Result<(), CompilerDiagnostic>;

// Passes that don't need env
fn pass(func: &mut HirFunction);

// Validation passes: read-only HIR, env for error recording
fn validate(func: &HirFunction, env: &mut Environment) -> Result<(), CompilerDiagnostic>;
```

Use `?` to propagate errors that would have thrown or short-circuited in TypeScript. Non-fatal errors are accumulated on `env` and checked at the end via `env.has_errors()`.

## Structural Similarity to TypeScript

Target ~85-95% structural correspondence. A developer should be able to view TypeScript and Rust side-by-side and trace the logic. The ported code should preserve:

- **Same high-level data flow** through the code. Only deviate where strictly necessary due to data model differences (arenas, borrow checker workarounds, etc.).
- **Same grouping of types, functions, and "classes" (structs with methods) into files.** A TypeScript file maps to a Rust file with the same logical contents.
- **Similar filenames, type names, and identifier names**, adjusted for Rust naming conventions (`camelCase` -> `snake_case` for functions/variables, `PascalCase` preserved for types).
- **Crate structure**: The monolithic `babel-plugin-react-compiler` package is split into crates, roughly 1:1 by top-level folder (e.g., `src/HIR/` -> a crate, `src/Inference/` -> a crate, etc.). We split the lowering logic (BuildHIR and HIRBuilder) into react_compiler_lowering bc of its complexity.

Key mechanical translations:

| TypeScript | Rust |
|---|---|
| `switch (value.kind)` | `match &value` (exhaustive) |
| `Map<Identifier, T>` | `HashMap<IdentifierId, T>` |
| `for...of` with `Set.delete()` | `set.retain(\|x\| ...)` |
| `instr.value = { kind: 'X', ... }` | `std::mem::replace` + reconstruct |
| `{ ...place, effect: Effect.Read }` | `Place { effect: Effect::Read, ..place.clone() }` |
| `array.filter(x => ...)` | `vec.retain(\|x\| ...)` |
| `identifier.mutableRange.end = x` | `env.identifiers[id].mutable_range.end = x` |
| Builder closures setting outer variables | Return values from closures |