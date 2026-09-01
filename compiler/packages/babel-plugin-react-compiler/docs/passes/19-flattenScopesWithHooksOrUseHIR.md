# flattenScopesWithHooksOrUseHIR

## File
`src/ReactiveScopes/FlattenScopesWithHooksOrUseHIR.ts`

## Purpose
This pass removes (flattens) reactive scopes that transitively contain hook calls or `use()` operator calls. The key insight is that:

1. **Hooks cannot be called conditionally** - wrapping them in a memoized scope would make them conditionally called based on whether the cache is valid
2. **The `use()` operator** - while it can be called conditionally in source code, React requires it to be called consistently if the component needs the returned value. Memoizing a scope containing `use()` would also make it conditionally called.

By running reactive scope inference first (agnostic of hooks), the compiler knows which values "construct together" in the same scope. The pass then removes ALL memoization for scopes containing hook/use calls to ensure they are always executed unconditionally.

## Input Invariants
- HIR must have reactive scope terminals already built (pass runs after `BuildReactiveScopeTerminalsHIR`)
- Blocks are visited in order (the pass iterates through `fn.body.blocks`)
- Scope terminals have a `block` (body of the scope) and `fallthrough` (block after the scope)
- Type inference has run so that `getHookKind()` and `isUseOperator()` can identify hooks and use() calls

## Output Guarantees
- All scopes that transitively contained a hook or `use()` call are either:
  - Converted to `LabelTerminal` - if the scope body is trivial (just the hook call and a goto)
  - Converted to `PrunedScopeTerminal` - if the scope body contains other instructions besides the hook call
- The `PrunedScopeTerminal` still tracks the original scope information for downstream passes but will not generate memoization code
- The control flow structure is preserved (same blocks, same fallthroughs)

## Algorithm

### Phase 1: Identify Scopes Containing Hook/Use Calls
1. Maintain a stack `activeScopes` of currently "open" reactive scopes
2. Iterate through all blocks in order
3. When entering a block:
   - Remove any scopes from `activeScopes` whose fallthrough equals the current block (those scopes have ended)
4. For each instruction in the block:
   - If it's a `CallExpression` or `MethodCall` and the callee is a hook or use operator:
     - Add all currently active scopes to the `prune` list
     - Clear `activeScopes` (these scopes are now marked for pruning)
5. If the block's terminal is a `scope`:
   - Push it onto `activeScopes`

### Phase 2: Prune Identified Scopes
For each block ID in `prune`:
1. Get the scope terminal
2. Check if the scope body is trivial (single instruction + goto to fallthrough):
   - If trivial: Convert to `LabelTerminal` (will be removed by `PruneUnusedLabels`)
   - If non-trivial: Convert to `PrunedScopeTerminal` (preserves scope info but skips memoization)

## Key Data Structures

```typescript
// Stack tracking currently open scopes
activeScopes: Array<{block: BlockId; fallthrough: BlockId}>

// List of block IDs whose scope terminals should be pruned
prune: Array<BlockId>

// Terminal types used
LabelTerminal: {kind: 'label', block, fallthrough, id, loc}
PrunedScopeTerminal: {kind: 'pruned-scope', block, fallthrough, scope, id, loc}
ReactiveScopeTerminal: {kind: 'scope', block, fallthrough, scope, id, loc}
```

## Edge Cases

### Nested Scopes
When a hook is found in an inner scope, ALL enclosing scopes are also pruned (the hook call would become conditional if any outer scope were memoized).

### Method Call Hooks
Handles both `CallExpression` (e.g., `useHook(...)`) and `MethodCall` (e.g., `obj.useHook(...)`).

### Trivial Hook-Only Scopes
If a scope exists just for a hook call (single instruction + goto), it's converted to a `LabelTerminal` which is a simpler structure that gets cleaned up by later passes.

### Multiple Hooks in Sequence
Once the first hook is encountered, all active scopes are pruned and cleared, so subsequent hooks in outer scopes still work correctly.

## TODOs
None explicitly marked in the source file.

## Example

### Fixture: `nested-scopes-hook-call.js`

**Input:**
```javascript
function component(props) {
  let x = [];
  let y = [];
  y.push(useHook(props.foo));
  x.push(y);
  return x;
}
```

**Before FlattenScopesWithHooksOrUseHIR:**
```
bb0:
  [1] Scope @0 [1:22] block=bb6 fallthrough=bb7    // Outer scope for x
bb6:
  [2] $22 = Array []         // x = []
  [3] StoreLocal x = $22
  [4] Scope @1 [4:17] block=bb8 fallthrough=bb9   // Inner scope for y
bb8:
  [5] $25 = Array []         // y = []
  [6] StoreLocal y = $25
  ...
  [10] $33 = Call useHook(...)  // <-- Hook call here!
  [11] MethodCall y.push($33)
```

**After FlattenScopesWithHooksOrUseHIR:**
```
bb0:
  [1] <pruned> Scope @0 [1:22] block=bb6 fallthrough=bb7   // PRUNED
bb6:
  [2] $22 = Array []
  [3] StoreLocal x = $22
  [4] <pruned> Scope @1 [4:17] block=bb8 fallthrough=bb9  // PRUNED
bb8:
  [5] $25 = Array []
  [6] StoreLocal y = $25
  ...
  [12] Label block=bb10 fallthrough=bb11   // Hook call converted to label
bb10:
  [13] $33 = Call useHook(...)
  [14] Goto bb11
...
```

**Final Output (no memoization):**
```javascript
function component(props) {
  const x = [];
  const y = [];
  y.push(useHook(props.foo));
  x.push(y);
  return x;
}
```

Notice that:
1. Both scope @0 and scope @1 are marked as `<pruned>` because the hook call is inside scope @1, which is inside scope @0
2. The final output has no memoization wrappers - just the raw code
