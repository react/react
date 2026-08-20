# inferReactivePlaces

## File
`src/Inference/InferReactivePlaces.ts`

## Purpose
Determines which `Place`s (identifiers and temporaries) in the HIR are **reactive** - meaning they may *semantically* change over the course of the component or hook's lifetime. This information is critical for memoization: reactive places form the dependencies that, when changed, should invalidate cached values.

A place is reactive if it derives from any source of reactivity:
1. **Props** - Component parameters may change between renders
2. **Hooks** - Hooks can access state or context which can change
3. **`use` operator** - Can access context which may change
4. **Mutation with reactive operands** - Values mutated in instructions that have reactive operands become reactive themselves
5. **Conditional assignment based on reactive control flow** - Values assigned in branches controlled by reactive conditions become reactive

## Input Invariants
- HIR is in SSA form with phi nodes at join points
- `inferMutationAliasingEffects` and `inferMutationAliasingRanges` have run, establishing:
  - Effect annotations on operands (Effect.Capture, Effect.Store, Effect.Mutate, etc.)
  - Mutable ranges on identifiers
  - Aliasing relationships captured by `findDisjointMutableValues`
- All operands have known effects (asserts on `Effect.Unknown`)

## Output Guarantees
- Every reactive Place has `place.reactive = true`
- Reactivity is transitively complete (derived from reactive → reactive)
- All identifiers in a mutable alias group share reactivity
- Reactivity is propagated to operands used within nested function expressions

## Algorithm
The algorithm uses **fixpoint iteration** to propagate reactivity forward through the control-flow graph:

### Initialization
1. Create a `ReactivityMap` backed by disjoint sets of mutably-aliased identifiers
2. Mark all function parameters as reactive (props are reactive by definition)
3. Create a `ControlDominators` helper to identify blocks controlled by reactive conditions

### Fixpoint Loop
Iterate until no changes occur:

For each block:
1. **Phi Nodes**: Mark phi nodes reactive if:
   - Any operand is reactive, OR
   - Any predecessor block is controlled by a reactive condition (control-flow dependency)

2. **Instructions**: For each instruction:
   - Track stable identifier sources (for hooks like `useRef`, `useState` dispatch)
   - Check if any operand is reactive
   - Hook calls and `use` operator are sources of reactivity
   - If instruction has reactive input:
     - Mark lvalues reactive (unless they are known-stable like `setState` functions)
   - If instruction has reactive input OR is in reactive-controlled block:
     - Mark mutable operands (Capture, Store, Mutate effects) as reactive

3. **Terminals**: Check terminal operands for reactivity

### Post-processing
Propagate reactivity to inner functions (nested `FunctionExpression` and `ObjectMethod`).

## Key Data Structures

### ReactivityMap
```typescript
class ReactivityMap {
  hasChanges: boolean = false;           // Tracks if fixpoint changed
  reactive: Set<IdentifierId> = new Set(); // Set of reactive identifiers
  aliasedIdentifiers: DisjointSet<Identifier>; // Mutable alias groups
}
```
- Uses disjoint sets so that when one identifier in an alias group becomes reactive, they all are effectively reactive
- `isReactive(place)` checks and marks `place.reactive = true` as a side effect
- `snapshot()` resets change tracking and returns whether changes occurred

### StableSidemap
```typescript
class StableSidemap {
  map: Map<IdentifierId, {isStable: boolean}> = new Map();
}
```
Tracks sources of stability (e.g., `useState()[1]` dispatch function). Forward data-flow analysis that:
- Records hook calls that return stable types
- Propagates stability through PropertyLoad and Destructure from stable containers
- Propagates through LoadLocal and StoreLocal

### ControlDominators
Uses post-dominator frontier analysis to determine which blocks are controlled by reactive branch conditions.

## Edge Cases

### Backward Reactivity Propagation via Mutable Aliasing
```javascript
const x = [];
const z = [x];
x.push(props.input);
return <div>{z}</div>;
```
Here `z` aliases `x` which is later mutated with reactive data. The disjoint set ensures `z` becomes reactive even though the mutation happens after its creation.

### Stable Types Are Not Reactive
```javascript
const [state, setState] = useState();
// setState is stable - not marked reactive despite coming from reactive hook
```
The `StableSidemap` tracks these and skips marking them reactive.

### Ternary with Stable Values Still Reactive
```javascript
props.cond ? setState1 : setState2
```
Even though both branches are stable types, the result depends on reactive control flow, so it cannot be marked non-reactive just based on type.

### Phi Nodes with Reactive Predecessors
When a phi's predecessor block is controlled by a reactive condition, the phi becomes reactive even if its operands are all non-reactive constants.

## TODOs
No explicit TODO comments are present in the source file. However, comments note:

- **ComputedLoads not handled for stability**: Only PropertyLoad propagates stability from containers, not ComputedLoad. The comment notes this is safe because stable containers have differently-typed elements, but ComputedLoad handling could be added.

## Example

### Fixture: `reactive-dependency-fixpoint.js`

**Input:**
```javascript
function Component(props) {
  let x = 0;
  let y = 0;
  while (x === 0) {
    x = y;
    y = props.value;
  }
  return [x];
}
```

**Before InferReactivePlaces:**
```
bb1 (loop):
  store x$26:TPhi:TPhi: phi(bb0: read x$21:TPrimitive, bb3: read x$32:TPhi)
  store y$30:TPhi:TPhi: phi(bb0: read y$24:TPrimitive, bb3: read y$37)
  ...
bb3 (block):
  [12] mutate? $35 = LoadLocal read props$19
  [13] mutate? $36 = PropertyLoad read $35.value
  [14] mutate? $38 = StoreLocal Reassign mutate? y$37 = read $36
```

**After InferReactivePlaces:**
```
bb1 (loop):
  store x$26:TPhi{reactive}:TPhi: phi(bb0: read x$21:TPrimitive, bb3: read x$32:TPhi{reactive})
  store y$30:TPhi{reactive}:TPhi: phi(bb0: read y$24:TPrimitive, bb3: read y$37{reactive})
  [6] mutate? $27:TPhi{reactive} = LoadLocal read x$26:TPhi{reactive}
  ...
bb3 (block):
  [12] mutate? $35{reactive} = LoadLocal read props$19{reactive}
  [13] mutate? $36{reactive} = PropertyLoad read $35{reactive}.value
  [14] mutate? $38{reactive} = StoreLocal Reassign mutate? y$37{reactive} = read $36{reactive}
```

**Key observations:**
- `props$19` is marked `{reactive}` as a function parameter
- The reactivity propagates through the loop:
  - First iteration: `y$37` becomes reactive from `props.value`
  - Second iteration: `x$32` becomes reactive from `y$30` (which is reactive via the phi from `y$37`)
  - The phi nodes `x$26` and `y$30` become reactive because their bb3 operands are reactive
- The fixpoint algorithm handles this backward propagation through the loop correctly
- The final output `$40` is reactive, so the array `[x]` will be memoized with `x` as a dependency
