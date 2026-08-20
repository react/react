# validateNoRefAccessInRender

## File
`src/Validation/ValidateNoRefAccessInRender.ts`

## Purpose
This validation pass ensures that React refs are not mutated during render. Refs are mutable containers for values that are not needed for rendering. Accessing or mutating `ref.current` during render can cause components to not update as expected because React does not track ref mutations.

The pass validates both direct ref mutations at the component level and ref mutations inside functions that are called during render.

## Input Invariants
- The function has been through type inference
- Ref types are properly identified (`useRef` return values)
- Function expressions have been lowered

## Validation Rules
The pass produces errors for:

1. **Direct ref mutation in render**: Assigning to `ref.current` at the top level of a component
2. **Ref mutation in render helper**: Mutating a ref inside a function that is called during render
3. **Duplicate ref initialization**: Initializing a ref more than once within null-guard blocks

**Exception - Null-guard initialization pattern**: The pass allows a single initialization of `ref.current` inside an `if (ref.current == null)` block. This is a common pattern for lazy initialization:

```javascript
// ALLOWED - null-guard initialization
if (ref.current == null) {
  ref.current = expensiveComputation();
}
```

Error messages produced:
- Category: `Refs`
- Reason: "Cannot access refs during render"
- Messages:
  - "Cannot update ref during render"
  - "Ref is initialized more than once during render"
  - "Ref was first initialized here" (for duplicate initialization)

## Algorithm

### Phase 1: Initialize Ref Tracking
Track refs from function parameters and context (captured variables):

```typescript
for (const param of fn.params) {
  if (isUseRefType(place.identifier)) {
    refs.set(place.identifier.id, {kind: 'Ref', refId: makeRefId()});
  }
}
```

### Phase 2: Single Forward Pass
Process all blocks in order, tracking:
- `refs`: Map of identifier IDs to ref information
- `nullables`: Set of identifiers known to be null/undefined
- `guards`: Map of comparison results (e.g., `ref.current == null`)
- `safeBlocks`: Map of blocks where null-guard allows initialization
- `refMutatingFunctions`: Map of function identifiers that mutate refs

### Phase 3: Process Instructions
For each instruction, handle:

```typescript
switch (value.kind) {
  case 'PropertyLoad': {
    // Track ref.current access
    if (objRef?.kind === 'Ref' && value.property === 'current') {
      refs.set(lvalue.identifier.id, {kind: 'RefValue', refId: objRef.refId});
    }
    break;
  }
  case 'PropertyStore': {
    // Check for ref mutation
    if (isRef && isCurrentProperty && !isNullGuardInit) {
      if (isTopLevel) {
        errors.pushDiagnostic(makeRefMutationError(instr.loc));
      }
      return mutation;
    }
    break;
  }
  case 'FunctionExpression': {
    // Recursively validate with isTopLevel=false
    const mutation = validateFunction(..., false, errors);
    if (mutation != null) {
      refMutatingFunctions.set(lvalue.identifier.id, mutation);
    }
    break;
  }
  case 'CallExpression': {
    // Check if calling a ref-mutating function
    if (refMutatingFunctions.has(callee.identifier.id) && isTopLevel) {
      errors.pushDiagnostic(makeRefMutationError(mutationInfo.loc));
    }
    break;
  }
}
```

### Phase 4: Guard Detection and Propagation
When encountering an `if` terminal with a null-guard condition:

```typescript
if (block.terminal.kind === 'if') {
  const guard = guards.get(block.terminal.test.identifier.id);
  if (guard != null) {
    // For equality checks (==, ===), consequent is safe
    // For inequality checks (!=, !==), alternate is safe
    const safeBlock = guard.isEquality
      ? block.terminal.consequent
      : block.terminal.alternate;
    // Propagate safety through control flow
  }
}
```

## Edge Cases

### Null-Guard Initialization Pattern (Allowed)
```javascript
function Component() {
  const ref = useRef(null);
  if (ref.current == null) {
    ref.current = computeValue();  // OK - first initialization
  }
  return <div />;
}
```

### Duplicate Initialization (Error)
```javascript
function Component() {
  const ref = useRef(null);
  if (ref.current == null) {
    ref.current = value1;  // First init - tracked
  }
  if (ref.current == null) {
    ref.current = value2;  // Error: duplicate initialization
  }
}
```

### Negated Null Check
The pass correctly handles negated null checks:
```javascript
if (ref.current !== null) {
  // NOT safe for initialization
} else {
  // Safe for initialization (ref.current is null here)
}
```

### Ref Mutation in Called Function
```javascript
function Component(props) {
  const ref = useRef(null);
  const renderItem = item => {
    ref.current = item;  // Mutation tracked in function
    return <Item item={item} />;
  };
  // Error: calling function that mutates ref during render
  return <List>{props.items.map(renderItem)}</List>;
}
```

### Ref Mutation in Event Handler (Allowed)
```javascript
function Component() {
  const ref = useRef(null);
  const onClick = () => {
    ref.current = value;  // OK - not called during render
  };
  return <button onClick={onClick} />;  // onClick is passed, not called
}
```

### Arbitrary Comparison Values (Error)
Only `null` or `undefined` comparisons are recognized as null guards:
```javascript
const DEFAULT_VALUE = 1;
if (ref.current == DEFAULT_VALUE) {
  ref.current = 1;  // Error: not a null guard
}
```

## TODOs
None in the source file.

## Example

### Fixture: `error.invalid-disallow-mutating-ref-in-render.js`

**Input:**
```javascript
// @validateRefAccessDuringRender
function Component() {
  const ref = useRef(null);
  ref.current = false;

  return <button ref={ref} />;
}
```

**Error:**
```
Found 1 error:

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be
accessed outside of render, such as in event handlers or effects. Accessing a
ref value (the `current` property) during render can cause your component not
to update as expected (https://react.dev/reference/react/useRef).

error.invalid-disallow-mutating-ref-in-render.ts:4:2
  2 | function Component() {
  3 |   const ref = useRef(null);
> 4 |   ref.current = false;
    |   ^^^^^^^^^^^ Cannot update ref during render
  5 |
  6 |   return <button ref={ref} />;
  7 | }
```

### Fixture: `error.invalid-ref-in-callback-invoked-during-render.js`

**Input:**
```javascript
// @validateRefAccessDuringRender
function Component(props) {
  const ref = useRef(null);
  const renderItem = item => {
    const current = ref.current;
    return <Foo item={item} current={current} />;
  };
  return <Items>{props.items.map(item => renderItem(item))}</Items>;
}
```

**Error:**
```
Found 1 error:

Error: Cannot access ref value during render

React refs are values that are not needed for rendering...

error.invalid-ref-in-callback-invoked-during-render.ts:6:37
  4 |   const renderItem = item => {
  5 |     const current = ref.current;
> 6 |     return <Foo item={item} current={current} />;
    |                                      ^^^^^^^ Ref value is used during render
  7 |   };
  8 |   return <Items>{props.items.map(item => renderItem(item))}</Items>;

error.invalid-ref-in-callback-invoked-during-render.ts:5:20
  3 |   const ref = useRef(null);
  4 |   const renderItem = item => {
> 5 |     const current = ref.current;
    |                     ^^^^^^^^^^^ Ref is initially accessed
```

Key observations:
- Direct mutation at render level is an immediate error
- Functions that mutate refs are tracked; errors occur when those functions are called at render level
- The null-guard pattern allows a single initialization
- The pass distinguishes between refs (`useRef` return type) and ref values (`.current` property)
