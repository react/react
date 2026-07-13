# flattenReactiveLoopsHIR

## File
`src/ReactiveScopes/FlattenReactiveLoopsHIR.ts`

## Purpose
This pass **prunes reactive scopes that are nested inside loops** (for, for-in, for-of, while, do-while). The compiler does not yet support memoization within loops because:

1. Loop iterations would require reconciliation across runs (similar to how `key` is used in JSX for lists)
2. There is no way to identify values across iterations
3. The current approach is to memoize *around* the loop rather than *within* it

When a reactive scope is found inside a loop body, the pass converts its terminal from `scope` to `pruned-scope`. A `pruned-scope` terminal is later treated specially during codegen - its instructions are emitted inline without any memoization guards.

## Input Invariants
- The HIR has been through `buildReactiveScopeTerminalsHIR`, which creates `scope` terminal nodes for reactive scopes
- The HIR is in valid block form with proper terminal kinds
- The block ordering respects control flow (blocks are iterated in order, with loop fallthroughs appearing after loop bodies)

## Output Guarantees
- All `scope` terminals that appear inside any loop body are converted to `pruned-scope` terminals
- Scopes outside of loops remain unchanged as `scope` terminals
- The structure of blocks is preserved; only the terminal kind is mutated
- The `pruned-scope` terminal retains all the same fields as `scope` (block, fallthrough, scope, id, loc)

## Algorithm

The algorithm uses a **linear scan with a stack-based loop tracking** approach:

```
1. Initialize an empty array `activeLoops` to track which loop(s) we are currently inside
2. For each block in the function body (in order):
   a. Remove the current block ID from activeLoops (if present)
      - This happens when we reach a loop's fallthrough block, exiting the loop
   b. Examine the block's terminal:
      - If it's a loop terminal (do-while, for, for-in, for-of, while):
        Push the loop's fallthrough block ID onto activeLoops
      - If it's a scope terminal AND activeLoops is non-empty:
        Convert the terminal to pruned-scope (keeping all other fields)
      - All other terminal kinds are ignored
```

Key insight: The algorithm tracks when we "enter" a loop by pushing the fallthrough ID when encountering a loop terminal, and "exits" the loop when that fallthrough block is visited.

## Key Data Structures

### activeLoops: Array<BlockId>
A stack of block IDs representing loop fallthroughs. When non-empty, we are inside one or more nested loops.

### PrunedScopeTerminal
```typescript
export type PrunedScopeTerminal = {
  kind: 'pruned-scope';
  fallthrough: BlockId;
  block: BlockId;
  scope: ReactiveScope;
  id: InstructionId;
  loc: SourceLocation;
};
```

### retainWhere
Utility from utils.ts - an in-place array filter that removes elements not matching the predicate.

## Edge Cases

### Nested Loops
The algorithm handles nested loops correctly because `activeLoops` is an array that can contain multiple fallthrough IDs. A scope deep inside multiple nested loops will still be pruned.

### Scope Spanning the Loop
If a scope terminal appears before the loop terminal but its body contains the loop, it is NOT pruned because the scope terminal itself is not inside the loop.

### Multiple Loops in Sequence
When exiting one loop (reaching its fallthrough) and entering another, `activeLoops` correctly clears the first loop before potentially adding the second.

### Control Flow That Exits Loops (break/return)
The algorithm relies on block ordering and fallthrough IDs. Early exits via break/return don't affect the tracking since we track by fallthrough block ID.

## TODOs
No explicit TODOs in this file. However, the docstring mentions future improvements:
> "Eventually we may integrate more deeply into the runtime so that we can do a single level of reconciliation"

This suggests a potential future feature to support memoization within loops via runtime integration.

## Example

### Fixture: `repro-memoize-for-of-collection-when-loop-body-returns.js`

**Input:**
```javascript
function useHook(nodeID, condition) {
  const graph = useContext(GraphContext);
  const node = nodeID != null ? graph[nodeID] : null;

  for (const key of Object.keys(node?.fields ?? {})) {
    if (condition) {
      return new Class(node.fields?.[field]);  // <-- Scope @4 is here
    }
  }
  return new Class();  // <-- Scope @5 is here (outside loop)
}
```

**Before FlattenReactiveLoopsHIR:**
```
[45] Scope scope @3 [45:72] ... block=bb35 fallthrough=bb36
bb35:
  [46] ForOf init=bb6 test=bb7 loop=bb8 fallthrough=bb5
  ...
  [66] Scope scope @4 [66:69] ... block=bb37 fallthrough=bb38  <-- Inside loop
  ...
  [73] Scope scope @5 [73:76] ... block=bb39 fallthrough=bb40  <-- Outside loop
```

**After FlattenReactiveLoopsHIR:**
```
[45] Scope scope @3 [45:72] ... block=bb35 fallthrough=bb36    <-- Unchanged
...
[66] <pruned> Scope scope @4 [66:69] ... block=bb37 fallthrough=bb38  <-- PRUNED!
...
[73] Scope scope @5 [73:76] ... block=bb39 fallthrough=bb40    <-- Unchanged
```

**Final Codegen Result:**
```javascript
function useHook(nodeID, condition) {
  const $ = _c(7);
  // ... memoized Object.keys call (scope @2)

  let t1;
  if ($[2] !== condition || $[3] !== node || $[4] !== t0) {
    // Scope @3 wraps the loop
    t1 = Symbol.for("react.early_return_sentinel");
    bb0: for (const key of t0) {
      if (condition) {
        t1 = new Class(node.fields?.[field]);  // Scope @4 was PRUNED - no memoization
        break bb0;
      }
    }
    $[2] = condition;
    $[3] = node;
    $[4] = t0;
    $[5] = t1;
  } else {
    t1 = $[5];
  }
  // ...

  // Scope @5 - memoized (sentinel check)
  if ($[6] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = new Class();
    $[6] = t2;
  }
  return t2;
}
```

The `new Class(...)` inside the loop has no memoization guards because scope @4 was pruned. The `new Class()` outside the loop retains its memoization via scope @5.
