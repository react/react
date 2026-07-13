# validateNoSetStateInRender

## File
`src/Validation/ValidateNoSetStateInRender.ts`

## Purpose
Validates that a component does not unconditionally call `setState` during render, which would cause an infinite update loop. This pass is conservative and may miss some cases (false negatives) but avoids false positives.

## Input Invariants
- Operates on HIRFunction (pre-reactive scope inference)
- Must run before reactive scope inference
- Uses `computeUnconditionalBlocks` to determine which blocks always execute

## Validation Rules
This pass detects two types of violations:

1. **Unconditional setState in render**: Calling `setState` (or a function that transitively calls setState) in a block that always executes during render.

2. **setState inside useMemo**: Calling `setState` inside a `useMemo` callback, which can cause infinite loops when the memo's dependencies change.

### Error Messages

**For unconditional setState in render:**
```
Error: Cannot call setState during render

Calling setState during render may trigger an infinite loop.
* To reset state when other state/props change, store the previous value in state and update conditionally: https://react.dev/reference/react/useState#storing-information-from-previous-renders
* To derive data from other state/props, compute the derived data during render without using state
```

**For setState in useMemo:**
```
Error: Calling setState from useMemo may trigger an infinite loop

Each time the memo callback is evaluated it will change state. This can cause a memoization dependency to change, running the memo function again and causing an infinite loop. Instead of setting state in useMemo(), prefer deriving the value during render.
```

## Algorithm
1. Compute the set of unconditional blocks using post-dominator analysis
2. Initialize a set `unconditionalSetStateFunctions` to track functions that unconditionally call setState
3. Traverse all blocks and instructions:
   - **LoadLocal/StoreLocal**: Propagate setState tracking through variable assignments and loads
   - **FunctionExpression/ObjectMethod**: Recursively check if the function unconditionally calls setState. If so, add the function's lvalue to the tracking set
   - **StartMemoize/FinishMemoize**: Track when inside a manual memoization block (useMemo/useCallback)
   - **CallExpression**: Check if the callee is a setState function or tracked setter:
     - If inside a memoize block, emit a useMemo-specific error
     - If in an unconditional block, emit a render-time setState error

### Key Helper: `computeUnconditionalBlocks`
Uses post-dominator tree analysis to find blocks that always execute when the function runs. The analysis ignores throw statements since hooks only need consistent ordering for normal execution paths.

## Edge Cases

### Conditional setState is allowed
```javascript
// This is valid - setState is conditional
if (someCondition) {
  setState(newValue);
}
```

### Transitive detection through functions
```javascript
// Detected - setTrue unconditionally calls setState
const setTrue = () => setState(true);
setTrue(); // Error here
```

### False negative: setState in data structures
```javascript
// NOT detected - setState stored in array then extracted
const [state, setState] = useState(false);
const x = [setState];
const y = x.pop();
y(); // No error, but will cause infinite loop
```

### Feature flag: enableUseKeyedState
When enabled, the error message suggests using `useKeyedState(initialState, key)` as an alternative pattern for resetting state when dependencies change.

## TODOs
None in source code.

## Example

### Fixture: `error.invalid-unconditional-set-state-in-render.js`

**Input:**
```javascript
// @validateNoSetStateInRender
function Component(props) {
  const [x, setX] = useState(0);
  const aliased = setX;

  setX(1);
  aliased(2);

  return x;
}
```

**Error:**
```
Found 2 errors:

Error: Cannot call setState during render

Calling setState during render may trigger an infinite loop.
* To reset state when other state/props change, store the previous value in state and update conditionally: https://react.dev/reference/react/useState#storing-information-from-previous-renders
* To derive data from other state/props, compute the derived data during render without using state.

error.invalid-unconditional-set-state-in-render.ts:6:2
  4 |   const aliased = setX;
  5 |
> 6 |   setX(1);
    |   ^^^^ Found setState() in render
  7 |   aliased(2);
  8 |
  9 |   return x;

Error: Cannot call setState during render

...

error.invalid-unconditional-set-state-in-render.ts:7:2
   5 |
   6 |   setX(1);
>  7 |   aliased(2);
     |   ^^^^^^^ Found setState() in render
```

**Why it fails:** Both `setX(1)` and `aliased(2)` are unconditionally called during render. The pass tracks that `aliased` is assigned from `setX`, so calling `aliased()` is also detected as a setState call.
