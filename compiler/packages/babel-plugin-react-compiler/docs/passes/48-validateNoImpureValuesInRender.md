# validateNoImpureValuesInRender

## File
`src/Validation/ValidateNoImpureValuesInRender.ts`

## Purpose
This validation pass ensures that impure values (values derived from non-deterministic function calls) are not used in render output. Impure values can produce unstable results that update unpredictably when the component re-renders, violating React's requirement that components be pure and idempotent.

The pass tracks values produced by impure functions (like `Date.now()`, `Math.random()`, `performance.now()`) and errors if those values flow into JSX props, component return values, or other render-time contexts.

## Input Invariants
- The function has been through effect inference
- Aliasing effects have been computed on instructions
- `Impure` effects mark values from non-deterministic sources
- `Render` effects mark values used in render context

## Validation Rules
The pass produces errors when:

1. **Impure value in render context**: A value marked with an `Impure` effect flows into a position marked with a `Render` effect
2. **Impure function returns in render**: A function that returns an impure value is called during render

Error messages produced:
- Category: `ImpureValues`
- Reason: "Cannot access impure value during render"
- Description: "Calling an impure function can produce unstable results that update unpredictably when the component happens to re-render."

The error points to two locations:
1. Where the impure value is used in render (e.g., as a JSX prop)
2. Where the impure value originates (e.g., the `Date.now()` call)

## Algorithm

### Phase 1: Infer Impure Values
The pass iterates over all instructions to build a map of which identifiers contain impure values:

```typescript
function inferImpureValues(
  fn: HIRFunction,
  impure: Map<IdentifierId, ImpureEffect>,
  impureFunctions: Map<IdentifierId, ImpuritySignature>,
  cache: FunctionCache,
): ImpuritySignature
```

The algorithm uses a fixed-point iteration that propagates impurity through data flow:

1. **Process phi nodes**: If any operand of a phi is impure, the phi result is impure
2. **Process effects**: For each instruction's effects:
   - `Impure` effect: Mark the destination identifier as impure
   - `Alias/Assign/Capture/CreateFrom/ImmutableCapture`: Propagate impurity from source to destination
   - `CreateFunction`: Recursively analyze function expressions
   - `Apply`: When calling a function with an impurity signature, propagate impurity to call results

3. **Control flow sensitivity**: The pass also considers control-flow dominators to detect impure values that flow through conditional branches

### Phase 2: Validate Render Effects
After impurity inference converges, the pass validates all `Render` effects:

```typescript
function validateRenderEffect(effect: RenderEffect): void {
  const impureEffect = impure.get(effect.place.identifier.id);
  if (impureEffect != null) {
    // Emit error
  }
}
```

### Special Cases
- Values stored in refs (`isUseRefType`) are allowed to be impure since refs are not rendered
- JSX elements are excluded from impurity propagation (`isJsxType`)

## Edge Cases

### Impure Values Through Helper Functions
If a helper function returns an impure value and is called during render, both the call site and the original impure source are reported:

```javascript
function Component() {
  const now = () => Date.now();  // Source of impurity
  const render = () => {
    return <div>{now()}</div>;   // Error: impure value in render
  };
  return <div>{render()}</div>;  // Error: impure value in render
}
```

### Indirect Impurity Through Mutation
When an impure value is captured into another value through mutation, the destination becomes impure:

```javascript
function Component() {
  const obj = {};
  obj.time = Date.now();  // obj becomes impure
  return <Foo obj={obj} />;  // Error
}
```

### Phi Node Propagation
Impurity propagates through control flow merges:

```javascript
function Component({cond}) {
  let x;
  if (cond) {
    x = Date.now();  // Impure path
  } else {
    x = 0;           // Pure path
  }
  return <Foo x={x} />;  // Error: x may be impure
}
```

## TODOs
From the source file:

```typescript
/**
 * TODO: consider propagating impurity for assignments/mutations that
 * are controlled by an impure value.
 *
 * Example: This should error since we know the semantics of array.push,
 * it's a definite Mutate and definite Capture, not maybemutate+maybecapture:
 *
 * let x = [];
 * if (Date.now() < START_DATE) {
 *   x.push(1);
 * }
 * return <Foo x={x} />
 */
```

## Example

### Fixture: `error.invalid-impure-functions-in-render.js`

**Input:**
```javascript
// @validateNoImpureFunctionsInRender

function Component() {
  const date = Date.now();
  const now = performance.now();
  const rand = Math.random();
  return <Foo date={date} now={now} rand={rand} />;
}
```

**Error:**
```
Found 3 errors:

Error: Cannot access impure value during render

Calling an impure function can produce unstable results that update unpredictably
when the component happens to re-render.
(https://react.dev/reference/rules/components-and-hooks-must-be-pure#components-and-hooks-must-be-idempotent).

error.invalid-impure-functions-in-render.ts:7:20
  5 |   const now = performance.now();
  6 |   const rand = Math.random();
> 7 |   return <Foo date={date} now={now} rand={rand} />;
    |                     ^^^^ Cannot access impure value during render
  8 | }

error.invalid-impure-functions-in-render.ts:4:15
  2 |
  3 | function Component() {
> 4 |   const date = Date.now();
    |                ^^^^^^^^^^ `Date.now` is an impure function.
  5 |   const now = performance.now();

Error: Cannot access impure value during render
...
```

Key observations:
- Each impure function call (`Date.now`, `performance.now`, `Math.random`) produces a separate error
- The error shows both the usage location (in JSX) and the source location (the impure call)
- The pass is enabled via the `@validateNoImpureFunctionsInRender` pragma
