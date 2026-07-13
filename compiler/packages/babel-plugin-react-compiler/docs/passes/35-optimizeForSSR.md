# optimizeForSSR

## File
`src/Optimization/OptimizeForSSR.ts`

## Purpose
This pass applies Server-Side Rendering (SSR) specific optimizations. During SSR, React renders components to HTML strings without mounting them in the DOM. This means:

1. **Effects don't run** - `useEffect` and `useLayoutEffect` are no-ops
2. **Event handlers aren't needed** - There's no DOM to attach handlers to
3. **State is never updated** - Components render once with initial state
4. **Refs aren't attached** - There's no DOM to ref

The pass leverages these SSR characteristics to inline and simplify code, removing unnecessary runtime overhead.

## Input Invariants
- The function has been through type inference
- Hook types are properly identified (useState, useReducer, useEffect, etc.)
- Function types for callbacks are properly inferred

## Output Guarantees
- `useState(initialValue)` is inlined to just `[initialValue, noop]`
- `useReducer(reducer, initialArg, init?)` is inlined to `[init ? init(initialArg) : initialArg, noop]`
- `useEffect` and `useLayoutEffect` calls are removed entirely
- Event handler functions (functions that call setState) are replaced with empty functions
- Ref-typed values are removed from JSX props

## Algorithm

### Phase 1: Identify Inlinable State
```typescript
const inlinedState = new Map<IdentifierId, InstructionValue>();

for (const instr of block.instructions) {
  if (isUseStateCall(instr)) {
    // Store the initial value for inlining
    inlinedState.set(instr.lvalue.id, {
      kind: 'ArrayExpression',
      elements: [initialValue, noopFunction],
    });
  }

  if (isUseReducerCall(instr)) {
    // Compute initial state and store for inlining
    const initialState = init ? callInit(initialArg) : initialArg;
    inlinedState.set(instr.lvalue.id, {
      kind: 'ArrayExpression',
      elements: [initialState, noopFunction],
    });
  }
}
```

### Phase 2: Inline State Hooks
Replace useState/useReducer with their computed initial values:
```typescript
// Before:
$0 = useState(0)
[state, setState] = $0

// After (inlined):
$0 = [0, () => {}]
[state, setState] = $0
```

### Phase 3: Remove Effects
```typescript
if (isUseEffectCall(instr) || isUseLayoutEffectCall(instr)) {
  // Remove the instruction entirely
  block.instructions.splice(i, 1);
}
```

### Phase 4: Identify and Neuter Event Handlers
```typescript
// Functions that capture and call setState are event handlers
if (capturesSetState(functionExpr)) {
  // Replace with empty function
  instr.value = {
    kind: 'FunctionExpression',
    params: originalParams,
    body: emptyBody,
  };
}
```

### Phase 5: Remove Ref Props
```typescript
if (isJSX(instr) && hasRefProp(instr)) {
  // Remove ref={...} from JSX props
  removeRefProp(instr.value);
}
```

## Edge Cases

### useState with Function Initializer
When `useState` receives a function initializer, it must be called:
```javascript
// useState(() => expensive())
// SSR: Call the initializer to get the value
const [state] = [expensiveComputation(), noop];
```

### useReducer with Init Function
The optional `init` function is called with `initialArg`:
```javascript
// useReducer(reducer, arg, init)
// SSR: [init(arg), noop]
```

### Nested State Setters
Functions that transitively call setState are also event handlers:
```javascript
function outer() {
  function inner() {
    setState(x);  // inner is event handler
  }
  inner();  // outer is also event handler
}
```

### Conditional Event Handlers
Event handler detection is conservative - if a function might call setState, it's treated as an event handler.

### Refs in Nested Objects
Only direct `ref` props on JSX are removed:
```javascript
<div ref={myRef} />           // ref removed
<div config={{ref: myRef}} /> // ref NOT removed (nested)
```

## TODOs
None in the source file.

## Example

### Fixture: `ssr/optimize-ssr.js`

**Input:**
```javascript
function Component() {
  const [state, setState] = useState(0);
  const ref = useRef(null);
  const onChange = (e) => {
    setState(e.target.value);
  };
  useEffect(() => {
    log(ref.current.value);
  });
  return <input value={state} onChange={onChange} ref={ref} />;
}
```

**After SSR Optimization:**
```javascript
function Component() {
  const $ = _c(1);
  // useState inlined to [initialValue, noop]
  const [state] = [0, () => {}];

  // useRef returns object with current: null
  const ref = { current: null };

  // Event handler replaced with noop (it calls setState)
  const onChange = () => {};

  // useEffect removed entirely (no-op on SSR)

  // ref prop removed from JSX
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = <input value={state} onChange={onChange} />;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}
```

Key observations:
- `useState(0)` becomes `[0, () => {}]` - no hook call
- `useEffect(...)` is removed entirely
- `onChange` is replaced with empty function since it called `setState`
- `ref={ref}` prop is removed from JSX
- SSR output is simpler and has less runtime overhead
