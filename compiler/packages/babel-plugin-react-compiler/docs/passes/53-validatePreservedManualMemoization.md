# validatePreservedManualMemoization

## File
`src/Validation/ValidatePreservedManualMemoization.ts`

## Purpose
Validates that all explicit manual memoization (`useMemo`/`useCallback`) from the original source code is accurately preserved in the compiled output. This ensures that values the developer intended to be memoized remain memoized after compilation.

## Input Invariants
- Operates on ReactiveFunction (post-reactive scope inference)
- Manual memoization markers (`StartMemoize`/`FinishMemoize`) are present from earlier passes
- Scopes have been assigned and merged as appropriate

## Validation Rules
This pass validates three conditions:

### 1. Dependencies not mutated later
Validates that dependencies of manual memoization are not mutated after the memoization call:
```
Existing memoization could not be preserved. This dependency may be modified later
```

### 2. Inferred dependencies match source
Validates that the compiler's inferred dependencies match the manually specified dependencies:
```
Existing memoization could not be preserved. The inferred dependencies did not match
the manually specified dependencies, which could cause the value to change more or
less frequently than expected. The inferred dependency was `X`, but the source
dependencies were [Y, Z].
```

### 3. Output value is memoized
Validates that the memoized value actually ends up in a reactive scope:
```
Existing memoization could not be preserved. This value was memoized in source but
not in compilation output
```

## Algorithm

### State Management
The visitor tracks:
- `scopes: Set<ScopeId>` - All completed reactive scopes
- `prunedScopes: Set<ScopeId>` - Scopes that were pruned
- `temporaries: Map<IdentifierId, ManualMemoDependency>` - Temporary variable mappings
- `manualMemoState: ManualMemoBlockState | null` - Current manual memoization context

### ManualMemoBlockState
```typescript
type ManualMemoBlockState = {
  reassignments: Map<DeclarationId, Set<Identifier>>;  // Track inlined useMemo reassignments
  loc: SourceLocation;                                   // Source location for errors
  decls: Set<DeclarationId>;                             // Declarations within the memo block
  depsFromSource: Array<ManualMemoDependency> | null;   // Original deps from source
  manualMemoId: number;                                  // Unique ID for this memoization
};
```

### Processing Flow

1. **On `StartMemoize` instruction:**
   - Validate that dependencies' scopes have completed (not mutated later)
   - Initialize `manualMemoState` with source dependencies
   - Push error if any dependency's scope hasn't completed yet

2. **During memo block (between Start/Finish):**
   - Track all declarations made within the block
   - Track reassignments for inlined useMemo handling
   - Record property loads and temporaries

3. **On scope completion:**
   - Validate each scope dependency against source dependencies using `compareDeps()`
   - An inferred dependency matches if:
     - Root identifiers are the same (same named variable)
     - Paths are identical, OR
     - Inferred path is more specific (not involving `.current` refs)

4. **On `FinishMemoize` instruction:**
   - Validate that the memoized value is in a completed scope
   - Handle inlined useMemo with reassignment tracking
   - Push error if value is unmemoized

### Dependency Comparison Results
```typescript
enum CompareDependencyResult {
  Ok = 0,                    // Dependencies match
  RootDifference = 1,        // Different root variables
  PathDifference = 2,        // Different property paths
  Subpath = 3,               // Inferred is less specific
  RefAccessDifference = 4,   // ref.current access differs
}
```

## Edge Cases

### Inlined useMemo Handling
When useMemo is inlined, it produces `let` declarations followed by reassignments. The pass tracks these reassignments to ensure all code paths produce memoized values.

### Ref Access
Special handling for `.current` property access on refs. Since `ref_prev === ref_new` does not imply `ref_prev.current === ref_new.current`, the pass is strict about ref access differences.

### More Specific Dependencies
If the compiler infers a more specific dependency (e.g., `obj.prop.value` instead of `obj`), this is acceptable as long as it doesn't involve ref access.

## TODOs
None found in the source.

## Example

### Fixture: `error.preserve-use-memo-ref-missing-reactive.ts`

**Input:**
```javascript
// @validatePreserveExistingMemoizationGuarantees
import {useCallback, useRef} from 'react';

function useFoo({cond}) {
  const ref1 = useRef<undefined | (() => undefined)>();
  const ref2 = useRef<undefined | (() => undefined)>();
  const ref = cond ? ref1 : ref2;

  return useCallback(() => {
    if (ref != null) {
      ref.current();
    }
  }, []);
}
```

**Error:**
```
Found 1 error:

Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual
memoization could not be preserved. The inferred dependencies did not match the
manually specified dependencies, which could cause the value to change more or
less frequently than expected. The inferred dependency was `ref`, but the source
dependencies were []. Inferred dependency not present in source.

error.preserve-use-memo-ref-missing-reactive.ts:9:21
>  9 |   return useCallback(() => {
     |                      ^^^^^^^
> 10 |     if (ref != null) {
> 11 |       ref.current();
> 12 |     }
> 13 |   }, []);
     | ^^^^ Could not preserve existing manual memoization
```

**Why it fails:** The callback uses `ref` which is conditionally assigned based on `cond`. The compiler infers `ref` as a dependency, but the source specifies an empty dependency array `[]`. This mismatch means the memoization cannot be preserved as-is.
