# optimizeForSSR

## File
`src/Optimization/OptimizeForSSR.ts`

## Purpose
This pass runs only when `outputMode` is `'ssr'`. During Server-Side Rendering (SSR), React renders each component to HTML once, without a DOM. This means:

1. **Effects don't run** - `useEffect`, `useLayoutEffect`, and `useInsertionEffect` never fire
2. **Event handlers never fire** - There's no DOM to attach them to
3. **Refs aren't attached** - There's no DOM node to point at
4. **State starts at its initial value** - It can still change during that render: a component that calls its own setter during render is re-rendered with the new state, on the server too

The pass removes code that only matters on the client, and inlines initial state where nothing else needs the state's setter. Memoization is also disabled in SSR mode, but that is not part of this pass.

## Input Invariants
- Runs after `inferMutationAliasingEffects`; `deadCodeElimination` runs right after this pass in the pipeline
- Hook kinds and setState/startTransition types have been inferred

## Output Guarantees
- `useEffect`, `useLayoutEffect`, and `useInsertionEffect` calls become `undefined`
- Function expressions that call setState or startTransition (event handlers) become `undefined`
- `useEffectEvent(fn)` becomes `fn`
- Event handler props (`on[A-Z]...`) and `ref` props are removed from builtin elements; custom elements (tags containing `-`) keep them
- `const [state, setState] = useState(value)` becomes `const state = value`, `useReducer(reducer, arg)` becomes `arg`, and `useReducer(reducer, arg, init)` becomes `init(arg)`, but only if the setter (or dispatch function) is no longer read once the code above is removed. While any setter in the function is still read, or the function calls a custom hook, state that is read is also only inlined if it starts at a primitive literal, and `useReducer(reducer, arg, init)` is not inlined. Otherwise the hook is left in place.

## Algorithm

### Phase 1: Find State That May Be Inlined
A candidate is a `useState(value)` call where `value` is a primitive, plain object, or array, or a `useReducer(reducer, arg)` / `useReducer(reducer, arg, init)` call. Its result must be used only by an array destructuring whose first item is an identifier: any other use of the result rules it out.

### Phase 2: Remove Client-Only Code
Replace effects and event handlers with `undefined`, replace `useEffectEvent(fn)` with `fn`, and remove event handler and `ref` props from builtin elements.

### Phase 3: Inline State Whose Setter Is Unread
Find which identifiers are still read once the code removed in phase 2 is gone, the way `deadCodeElimination` would see them (`findReferencedIdentifiers`), without removing anything yet. Then a candidate is inlined if:

1. **Its setter is unread.** No destructured item after the state is still read. A setter that is still read (called during render, passed to a child, provided through context, or returned from a custom hook) would be left pointing at a variable that is no longer declared.
2. **Its value is the same in every render pass.** A setter that is still read may update state during render. React then renders the component again with the state it already has, but inlined state recomputes its initial value. So while any state hook's setter is still read (including hooks that are not candidates), or the function calls a custom hook (which may update its own state during render, or return a setter that the function calls), a candidate whose state is read is only inlined if its initial value is a primitive literal. A `useReducer(reducer, arg, init)` keeps its hook in that case even if its state is unread, because React calls `init` only on the first pass, while `init(arg)` would run again on every pass.

The destructuring of an inlined candidate becomes `StoreLocal state` and the hook call becomes its initial value. Hook calls stay in place until this point, so `useReducer(reducer, arg, init)` with unread state still becomes `init(arg)`, which `deadCodeElimination` keeps: the initializer runs, as it does in the original component.

`deadCodeElimination` removes unused `useState` and `useRef` calls in SSR mode, and unused `useReducer` calls without an initializer. It keeps a `useReducer` call that has an initializer, so the initializer still runs when its state ends up unused.

## Edge Cases

### Setter Called During Render
```javascript
const [ready, setReady] = useState(false);
if (!ready) {
  setReady(true); // React re-renders with the new state: useState is kept
}
```

### Setter Passed Along
```javascript
const [open, setOpen] = useState(false);
return <Dialog open={open} onOpenChange={setOpen} />; // useState is kept
```
The same applies to a setter in a context value or returned from a custom hook, and to `useReducer`'s dispatch function.

### Other State During a Render-Phase Update
```javascript
const [ready, setReady] = useState(false);
const [snapshot] = useState({ready}); // kept: the re-render must not recompute it
const [label] = useState('ready'); // inlined: a primitive literal is the same in every pass
if (!ready) {
  setReady(true);
}
```

### Reducer Initializer With Unread State
```javascript
const [config] = useReducer(reducer, json, JSON.parse);
useEffect(() => apply(config));
// becomes:
JSON.parse(json); // still runs (and throws for malformed JSON)
```

### Setter Only Read by Removed Code
```javascript
const [node, setNode] = useState(null);
return <div ref={setNode} data-measured={node !== null} />;
// becomes:
const node = null;
return <div data-measured={node !== null} />;
```

### Event Handler Detection
A function counts as an event handler only if its own body calls setState or startTransition. A function whose only setState call is inside a nested function is kept as is.

### Event Handlers Called During Render
The pass assumes event handlers are not called during render. A component that calls one during render (for example a local `reset()` helper that calls setState) gets `undefined` in its place and throws.

## TODOs
None in the source file.

## Example

### Fixture: `ssr/optimize-ssr.js`

**Input:**
```javascript
// @outputMode:"ssr"
function Component() {
  const [state, setState] = useState(0);
  const ref = useRef(null);
  const onChange = e => {
    setState(e.target.value);
  };
  useEffect(() => {
    log(ref.current.value);
  });
  return <input value={state} onChange={onChange} ref={ref} />;
}
```

**Output:**
```javascript
// @outputMode:"ssr"
function Component() {
  const state = 0;

  return <input value={state} />;
}
```

Key observations:
- `onChange` calls `setState`, so it is replaced with `undefined`; the `onChange` and `ref` props are removed from `<input>`
- `setState` is then unread, so `useState(0)` is inlined to `const state = 0`
- The effect is removed, which leaves `ref` and the `useRef` call unused, so dead code elimination removes them
