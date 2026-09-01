# validateNoSetStateInEffects

## File
`src/Validation/ValidateNoSetStateInEffects.ts`

## Purpose
Validates against calling `setState` synchronously in the body of an effect (`useEffect`, `useLayoutEffect`, `useInsertionEffect`), while allowing `setState` in callbacks scheduled by the effect. Synchronous setState in effects triggers cascading re-renders which hurts performance.

See: https://react.dev/learn/you-might-not-need-an-effect

## Input Invariants
- Operates on HIRFunction (pre-reactive scope inference)
- Effect hooks must be identified (`isUseEffectHookType`, `isUseLayoutEffectHookType`, `isUseInsertionEffectHookType`)
- setState functions must be identified (`isSetStateType`)
- Only runs when `outputMode === 'lint'`

## Validation Rules
This pass detects synchronous setState calls within effect bodies:

**Standard error message:**
```
Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended.
```

**Verbose error message** (when `enableVerboseNoSetStateInEffect` is enabled):
Provides more detailed guidance about specific anti-patterns like non-local derived data, derived event patterns, and force update patterns.

## Algorithm
1. **Main function traversal**: Build a map `setStateFunctions` tracking which identifiers are setState functions
2. For each instruction:
   - **LoadLocal/StoreLocal**: Propagate setState tracking through variable assignments
   - **FunctionExpression**: Check if the function synchronously calls setState by recursively calling `getSetStateCall()`. If so, track the function as a setState-calling function
   - **useEffectEvent call**: If the argument is a function that calls setState, track the return value as a setState function
   - **useEffect/useLayoutEffect/useInsertionEffect call**: Check if the callback argument is tracked as calling setState. If so, emit an error

3. **`getSetStateCall()` helper**: Recursively analyzes a function to find synchronous setState calls:
   - Tracks ref-derived values when `enableAllowSetStateFromRefsInEffects` is enabled
   - Propagates setState tracking through local variables
   - Returns the Place of the setState call if found, null otherwise

### Ref-derived setState exception
When `enableAllowSetStateFromRefsInEffects` is enabled, the pass allows setState calls where:
- The value being set is derived from a ref (`useRef` or `ref.current`)
- The block containing setState is controlled by a ref-dependent condition

This allows patterns like storing initial layout measurements from refs in state.

## Edge Cases

### Allowed: setState in callbacks
```javascript
// Valid - setState in event callback, not synchronous
useEffect(() => {
  const handler = () => {
    setState(newValue);
  };
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}, []);
```

### Transitive detection
```javascript
// Detected - transitive through function calls
const f = () => setState(value);
const g = () => f();
useEffect(() => {
  g(); // Error: calls setState transitively
});
```

### useEffectEvent tracking
```javascript
// Detected - useEffectEvent that calls setState is tracked
const handler = useEffectEvent(() => {
  setState(value);
});
useEffect(() => {
  handler(); // Error: handler calls setState
});
```

### Allowed: Ref-derived state (with flag)
```javascript
// Valid when enableAllowSetStateFromRefsInEffects is true
const ref = useRef(null);
useEffect(() => {
  const width = ref.current.offsetWidth;
  setWidth(width); // Allowed - derived from ref
}, []);
```

## TODOs
From the source code:
```typescript
/*
 * TODO: once we support multiple locations per error, we should link to the
 * original Place in the case that setStateFunction.has(callee)
 */
```

## Example

### Fixture: `invalid-setState-in-useEffect-transitive.js`

**Input:**
```javascript
// @loggerTestOnly @validateNoSetStateInEffects @outputMode:"lint"
import {useEffect, useState} from 'react';

function Component() {
  const [state, setState] = useState(0);
  const f = () => {
    setState(s => s + 1);
  };
  const g = () => {
    f();
  };
  useEffect(() => {
    g();
  });
  return state;
}
```

**Error:**
```
Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended.

invalid-setState-in-useEffect-transitive.ts:13:4
  11 |   };
  12 |   useEffect(() => {
> 13 |     g();
     |     ^ Avoid calling setState() directly within an effect
  14 |   });
```

**Why it fails:** Even though `setState` is not called directly in the effect, the pass traces through `g()` -> `f()` -> `setState()` and detects that the effect synchronously triggers a state update.
