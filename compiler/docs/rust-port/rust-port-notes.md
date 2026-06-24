## Input/Output Format: JSON AST and Scope Tree

* Define a Rust representation of the Babel AST format using serde with custom serialization/deserialization in order to ensure that we always produce the "type" field, even outside of enum positions. Include full information from Babel, including source locations.
* Define a Scope type that encodes the tree of scope information, mapping to the information that babel represents in its own scope tree

The main public API is roughly `compile(BabelAst, Scope) -> Option<BabelAst>` returning None if no changes, or Some with the updated ast.

## Arenas

Use arenas and Copy-able "id" values that index into the arenas in order to migrate "shared" mutable references.

* `Identifier`:
    * Table on Environment, stores actual Identifier values
    * `Place.identifier` references indirectly via `IdentifierId`
* `ReactiveScope`:
    * Table on Environment, stores actual ReactiveScope values
    * `Identifier`, scope terminals, etc reference indirectly via `ScopeID`
* `Function`:
    * Table on Environment, stores the inner HirFunction values
    * `InstructionValue::FunctionExpression` and `::ObjectMethod` reference indirectly via `FunctionId`
* `Type`:
    * Table on Environment, stores actual types
    * `Identifier` types and other type values use `TypeId` to index into

## Instructions Table

Store instructions indirectly. This allows passes that need to cache or remember an instruction's location (to work around borrowing issues) to have a single id to use to reference that instruction. Do not use `(BlockId, usize)` or similar.

* Rename `InstructionId` to `EvaluationOrder` - this type is actually about representing the evaluation order, and is not even instruction-specific: it is also present on terminals.
* `HirFunction` stores `instructions: Vec<InstructionId>`
* `BasicBlock.instructions` becomes `Vec<InstructionId>`, indexing into the `HirFunction.instructions` vec

## AliasingEffect

* `Place` values are cloned
* `Call` variant `args` array is cloned
* `CreateFunction` variant uses `FunctionId` referencing the function arena

## Environment

Pass a single mutable environment reference separately from the HIR.

* Remove `HIRFunction.env`, pass the environment as `env: &mut Environment` instead
* Maintain the existing fields/types of `Environment` type (don't group them)
* Use direct field access of Environment properties, rather than via methods, to allow precise sliced borrows of portions of the environment

## Error Handling

In general there are two categories of errors:
- Anything that would have thrown, or would have short-circuited, should return an `Err(...)` with the single diagnosstic
- Otherwise, accumulate errors directly onto the environment.
- Error handling must preserve the full details of the errors: reason, description, location, details, suggestions, category, etc

### Specific Error Patterns and Approaches

* TypeScript non-null assertions:
    * Example: `!`
    * Approach: panic via `.unwrap()` or similar.
* Throwing expressions:
    * Example: `throw ...` (latent bugs, should have been `invariant`)
    * Example: `CompilerError.invariant()`
    * Example: `CompilerError.throwTodo()`
    * Example: `CompilerError.throw*` (other "throw-" methods)
    * Approach: Make the function return a `Result<_, CompilerDiagnostic>`, and return `Err(...)` with the appropriate compiler error value. 
* Non-throwing expressions (Invariant):
    * Example: local `error` object and `error.pushDiagnostic()` (where the error *is* an invariant)
    * Approach: Make the function return a `Result<_, CompilerDiagnostic>`, and change the `pushDiagnostic()` with `return Err(...)` to return with the invariant error. 
* Non-throwing expressions (excluding Invariant):
    * Example: local `error` object and `error.pushDiagnostic()` (where the error is *not* an invariant)
    * Example: `env.recordError()` (where the error is *not* an invariant)
    * Approach: keep as-is

## Pass and Pipeline Structure 

Structure the pipeline and passes along these lines to align with the above error handling guidelines:

```
// pipeline.rs
fn compile(
    ast: Ast, 
    scope: Scope,
    env: &mut Environment,
) -> Result<CompileResult, CompilerDiagnostic>> {
    // "?" to handle cases that would have thrown or produced an invariant
    let mut hir = lower(ast, scope, env)?;
    some_compiler_pass(&mut hir, env)?;
    ...
    let ast = codegen(...)?;

    if (env.has_errors()) {
        // result with errors
        Ok(CompileResult::Failure(env.take_errors()))
    } else {
        // result with 
        Ok(CompileResult::Success(ast))
    }
}

// <compilerpasss>.rs
fn passname(
    func: &mut HirFunction,
    env: &mut Environment
) -> Result<_, CompilerDiagnostic>;
```