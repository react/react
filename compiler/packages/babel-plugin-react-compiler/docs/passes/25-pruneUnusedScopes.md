# pruneUnusedScopes

## File
`src/ReactiveScopes/PruneUnusedScopes.ts`

## Purpose
This pass converts reactive scopes that have no meaningful outputs into "pruned scopes". A pruned scope is no longer memoized - its instructions are executed unconditionally on every render. This optimization removes unnecessary memoization overhead for scopes that don't produce values that need to be cached.

## Input Invariants
- The input is a `ReactiveFunction` that has already been transformed into reactive scope form
- Scopes have been created and have `declarations`, `reassignments`, and potentially `earlyReturnValue` populated
- The pass is called after:
  - `pruneUnusedLabels` - cleans up unnecessary labels
  - `pruneNonEscapingScopes` - removes scopes whose outputs don't escape
  - `pruneNonReactiveDependencies` - removes non-reactive dependencies from scopes
- Scopes may already be marked as pruned by earlier passes

## Output Guarantees
Scopes that meet ALL of the following criteria are converted to `pruned-scope`:
- No return statement within the scope
- No reassignments (`scope.reassignments.size === 0`)
- Either no declarations (`scope.declarations.size === 0`), OR all declarations "bubbled up" from inner scopes

Pruned scopes:
- Keep their original scope metadata (for debugging/tracking)
- Keep their instructions intact
- Will be executed unconditionally during codegen (no memoization check)

## Algorithm

The pass uses the visitor pattern with `ReactiveFunctionTransform`:

1. **State Tracking**: A `State` object tracks whether a return statement was encountered:
   ```typescript
   type State = {
     hasReturnStatement: boolean;
   };
   ```

2. **Terminal Visitor** (`visitTerminal`): Checks if any terminal is a `return` statement

3. **Scope Transform** (`transformScope`): For each scope:
   - Creates a fresh state for this scope
   - Recursively visits the scope's contents
   - Checks pruning criteria:
     - `!scopeState.hasReturnStatement` - no early return
     - `scope.reassignments.size === 0` - no reassignments
     - `scope.declarations.size === 0` OR `!hasOwnDeclaration(scopeBlock)` - no outputs

4. **hasOwnDeclaration Helper**: Determines if a scope has "own" declarations vs declarations propagated from nested scopes

## Edge Cases

### Return Statements
Scopes containing return statements are preserved because early returns need memoization to avoid re-executing the return check on every render.

### Bubbled-Up Declarations
When nested scopes are flattened or merged, their declarations may be propagated to parent scopes. The `hasOwnDeclaration` check ensures that parent scopes with only inherited declarations can still be pruned.

### Reassignments
Scopes with reassignments are kept because the reassignment represents a side effect that needs to be tracked for memoization.

### Already-Pruned Scopes
The pass operates on `ReactiveScopeBlock` (kind: 'scope'), not `PrunedReactiveScopeBlock`. Scopes already pruned by earlier passes are not revisited.

### Interaction with Subsequent Passes
The `MergeReactiveScopesThatInvalidateTogether` pass explicitly handles pruned scopes - it does not merge across them.

## TODOs
None in the source file.

## Example

### Fixture: `prune-scopes-whose-deps-invalidate-array.js`

**Input:**
```javascript
function Component(props) {
  const x = [];
  useHook();
  x.push(props.value);
  const y = [x];
  return [y];
}
```

What happens:
- The scope for `x` cannot be memoized because `useHook()` is called inside it
- `FlattenScopesWithHooksOrUseHIR` marks scope @0 as `pruned-scope`
- `PruneUnusedScopes` doesn't change it further since it's already pruned

**Output (no memoization for x):**
```javascript
function Component(props) {
  const x = [];
  useHook();
  x.push(props.value);
  const y = [x];
  return [y];
}
```

### Key Insight

The `pruneUnusedScopes` pass is part of a multi-pass pruning strategy:
1. `FlattenScopesWithHooksOrUseHIR` - Prunes scopes that contain hook/use calls
2. `pruneNonEscapingScopes` - Prunes scopes whose outputs don't escape
3. `pruneNonReactiveDependencies` - Removes non-reactive dependencies
4. **`pruneUnusedScopes`** - Prunes scopes with no remaining outputs

This pass acts as a cleanup for scopes that became "empty" after previous pruning passes removed their outputs.
