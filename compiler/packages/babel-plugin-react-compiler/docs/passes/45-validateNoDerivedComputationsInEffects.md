# validateNoDerivedComputationsInEffects

## File
`src/Validation/ValidateNoDerivedComputationsInEffects.ts`

## Purpose
Validates that `useEffect` is not used for derived computations that could and should be performed during render. This catches a common anti-pattern where developers use effects to synchronize derived state, which causes unnecessary re-renders and complexity.

See: https://react.dev/learn/you-might-not-need-an-effect#updating-state-based-on-props-or-state

## Input Invariants
- Operates on HIRFunction (pre-reactive scope inference)
- Effect hooks must be identified (`isUseEffectHookType`)
- setState functions must be identified (`isSetStateType`)

## Validation Rules
The pass detects when an effect:
1. Has a dependency array (2nd argument)
2. The effect function only captures the dependencies and setState functions
3. The effect calls setState with a value derived solely from the dependencies
4. The effect has no control flow (loops with back edges)

When detected, it produces:
```
Error: Values derived from props and state should be calculated during render, not in an effect. (https://react.dev/learn/you-might-not-need-an-effect#updating-state-based-on-props-or-state)
```

## Algorithm
1. **Collection Phase**: Traverse all instructions to collect:
   - `candidateDependencies`: Map of ArrayExpression identifiers (potential deps arrays)
   - `functions`: Map of FunctionExpression identifiers (potential effect callbacks)
   - `locals`: Map of LoadLocal sources for identifier resolution

2. **Detection Phase**: When a `useEffect` call is found with 2 arguments:
   - Look up the effect function and dependencies array
   - Verify all dependency array elements are identifiers
   - Call `validateEffect()` on the effect function

3. **Effect Validation** (`validateEffect`):
   - Check that the effect only captures dependencies or setState functions
   - Check that all dependencies are actually used in the effect
   - Skip if any block has a back edge (loop)
   - Track data flow through instructions:
     - `LoadLocal`: Propagate dependency tracking
     - `PropertyLoad`, `BinaryExpression`, `TemplateLiteral`, `CallExpression`, `MethodCall`: Aggregate dependencies from operands
   - When `setState` is called with a single argument that depends on ALL effect dependencies, record the location
   - If any dependency is used in a terminal operand (control flow), abort validation
   - Push errors for all recorded setState locations

### Value Tracking
The pass maintains a `values` map from `IdentifierId` to `Array<IdentifierId>` tracking which effect dependencies each value derives from. When setState is called, if the argument derives from all dependencies, it's flagged as a derived computation.

## Edge Cases

### Allowed: Effects with side effects
```javascript
// Valid - effect captures external values, not just deps
useEffect(() => {
  logToServer(firstName);
  setFullName(firstName);
}, [firstName]);
```

### Allowed: Effects with loops
```javascript
// Valid - has control flow, not a simple derivation
useEffect(() => {
  let result = '';
  for (const item of items) {
    result += item;
  }
  setResult(result);
}, [items]);
```

### Allowed: Effects with conditional setState
```javascript
// Valid - setState is conditional on control flow
useEffect(() => {
  if (condition) {
    setFullName(firstName + lastName);
  }
}, [firstName, lastName]);
```

### Not detected: Subset of dependencies
```javascript
// Not flagged - only uses firstName, not lastName
useEffect(() => {
  setResult(firstName);
}, [firstName, lastName]);
```

## TODOs
None in source code.

## Example

### Fixture: `error.invalid-derived-computation-in-effect.js`

**Input:**
```javascript
// @validateNoDerivedComputationsInEffects
import {useEffect, useState} from 'react';

function BadExample() {
  const [firstName, setFirstName] = useState('Taylor');
  const [lastName, setLastName] = useState('Swift');

  // Avoid: redundant state and unnecessary Effect
  const [fullName, setFullName] = useState('');
  useEffect(() => {
    setFullName(firstName + ' ' + lastName);
  }, [firstName, lastName]);

  return <div>{fullName}</div>;
}
```

**Error:**
```
Found 1 error:

Error: Values derived from props and state should be calculated during render, not in an effect. (https://react.dev/learn/you-might-not-need-an-effect#updating-state-based-on-props-or-state)

error.invalid-derived-computation-in-effect.ts:11:4
   9 |   const [fullName, setFullName] = useState('');
  10 |   useEffect(() => {
> 11 |     setFullName(firstName + ' ' + lastName);
     |     ^^^^^^^^^^^ Values derived from props and state should be calculated during render, not in an effect.
  12 |   }, [firstName, lastName]);
  13 |
  14 |   return <div>{fullName}</div>;
```

**Why it fails:** The effect computes `fullName` purely from `firstName` and `lastName` (the dependencies) and then sets state. This is a derived computation that should be calculated during render:

```javascript
// Correct approach
const fullName = firstName + ' ' + lastName;
```
