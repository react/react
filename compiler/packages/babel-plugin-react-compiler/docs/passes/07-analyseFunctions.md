# analyseFunctions

## File
`src/Inference/AnalyseFunctions.ts`

## Purpose
Recursively analyzes all nested function expressions and object methods in a function to infer their aliasing effect signatures, which describe how the function affects its captured variables when invoked.

## Input Invariants
- The HIR has been through SSA conversion and type inference
- FunctionExpression and ObjectMethod instructions have an empty `aliasingEffects` array (`@aliasingEffects=[]`)
- Context variables (captured variables from outer scope) exist on `fn.context` but do not have their effect populated

## Output Guarantees
- Every FunctionExpression and ObjectMethod has its `aliasingEffects` array populated with the effects the function performs when called (mutations, captures, aliasing to return value, etc.)
- Each context variable's `effect` property is set to either `Effect.Capture` (if the variable is captured or mutated by the inner function) or `Effect.Read` (if only read)
- Context variable mutable ranges are reset to `{start: 0, end: 0}` and scopes are set to `null` to prepare for the outer function's subsequent `inferMutationAliasingRanges` pass

## Algorithm
1. **Recursive traversal**: Iterates through all blocks and instructions looking for `FunctionExpression` or `ObjectMethod` instructions
2. **Depth-first processing**: For each function expression found, calls `lowerWithMutationAliasing()` which:
   - Recursively calls `analyseFunctions()` on the inner function (handles nested functions)
   - Runs `inferMutationAliasingEffects()` on the inner function to determine effects
   - Runs `deadCodeElimination()` to clean up
   - Runs `inferMutationAliasingRanges()` to compute mutable ranges and extract externally-visible effects
   - Runs `rewriteInstructionKindsBasedOnReassignment()` and `inferReactiveScopeVariables()`
   - Stores the computed effects in `fn.aliasingEffects`
3. **Context variable effect classification**: Scans the computed effects to determine which context variables are captured/mutated vs only read:
   - Effects like `Capture`, `Alias`, `Assign`, `MaybeAlias`, `CreateFrom` mark the source as captured
   - Mutation effects (`Mutate`, `MutateTransitive`, etc.) mark the target as captured
   - Sets `operand.effect = Effect.Capture` or `Effect.Read` accordingly
4. **Range reset**: Resets mutable ranges and scopes on context variables to prepare for outer function analysis

## Key Data Structures
- **HIRFunction.aliasingEffects**: Array of `AliasingEffect` storing the externally-visible behavior of a function when called
- **Place.effect**: Effect enum value (`Capture` or `Read`) describing how a context variable is used
- **AliasingEffect**: Union type describing data flow (Capture, Alias, Assign, etc.) and mutations (Mutate, MutateTransitive, etc.)
- **FunctionExpression/ObjectMethod.loweredFunc.func**: The inner HIRFunction to analyze

## Edge Cases
- **Nested functions**: Handled via recursive call to `analyseFunctions()` before processing the current function - innermost functions are analyzed first
- **ObjectMethod**: Treated identically to FunctionExpression
- **Apply effects invariant**: The pass asserts that no `Apply` effects remain in the function's signature - these should have been resolved to more precise effects by `inferMutationAliasingRanges()`
- **Conditional mutations**: Effects like `MutateTransitiveConditionally` are tracked - a function that conditionally mutates a captured variable will have that effect in its signature
- **Immutable captures**: `ImmutableCapture`, `Freeze`, `Create`, `Impure`, `Render` effects do not contribute to marking context variables as `Capture`

## TODOs
- No TODO comments in the pass itself

## Example
Consider a function that captures and conditionally mutates a variable:

```javascript
function useHook(a, b) {
  let z = {a};
  let y = b;
  let x = function () {
    if (y) {
      maybeMutate(z);  // Unknown function, may mutate z
    }
  };
  return x;
}
```

**Before AnalyseFunctions:**
```
Function @context[y$28, z$25] @aliasingEffects=[]
```

**After AnalyseFunctions:**
```
Function @context[read y$28, capture z$25] @aliasingEffects=[
  MutateTransitiveConditionally z$25,
  Create $14 = primitive
]
```

The pass infers:
- `y` is only read (used in the condition)
- `z` is captured into the function and conditionally mutated transitively (because `maybeMutate()` is unknown)
- The inner function's signature includes `MutateTransitiveConditionally z$25` to indicate this potential mutation

This signature is then used by `InferMutationAliasingEffects` on the outer function to understand that creating this function captures `z`, and calling the function may mutate `z`.
