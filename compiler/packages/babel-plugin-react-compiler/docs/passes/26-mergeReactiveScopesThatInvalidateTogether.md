# mergeReactiveScopesThatInvalidateTogether

## File
`src/ReactiveScopes/MergeReactiveScopesThatInvalidateTogether.ts`

## Purpose
This pass is an optimization that reduces memoization overhead in the compiled output by merging reactive scopes that will always invalidate together. The pass operates on the ReactiveFunction representation and works in two main scenarios:

1. **Consecutive Scopes**: When two scopes appear sequentially in the same reactive block with identical dependencies (or where the output of the first scope is the sole input to the second), they are merged into a single scope. This reduces the number of memo cache slots used and eliminates redundant dependency comparisons.

2. **Nested Scopes**: When an inner scope has the same dependencies as its parent scope, the inner scope is flattened into the parent. Since PropagateScopeDependencies propagates dependencies upward, nested scopes can only have equal or fewer dependencies than their parents, never more. When they're equal, the inner scope always invalidates with the parent, making it safe and beneficial to flatten.

## Input Invariants
- The ReactiveFunction has already undergone scope dependency propagation (via `PropagateScopeDependencies`)
- The function has been pruned of unused scopes (via `pruneNonReactiveDependencies` and `pruneUnusedScopes`)
- Scopes have valid `dependencies`, `declarations`, `range`, and `reassignments` fields
- The ReactiveFunction is in a valid structural state with properly formed blocks and instructions

## Output Guarantees
- **Fewer scopes**: Consecutive and nested scopes with identical dependencies are merged
- **Valid scope ranges**: Merged scopes have their `range.end` updated to cover all merged instructions
- **Updated declarations**: Scope declarations are updated to remove any that are no longer used after the merged scope
- **Merged scope tracking**: The `scope.merged` set tracks which scope IDs were merged into each surviving scope
- **Preserved semantics**: Only safe-to-memoize intermediate instructions are absorbed into merged scopes

## Algorithm

The pass operates in multiple phases:

### Phase 1: Find Last Usage
A visitor (`FindLastUsageVisitor`) collects the last usage instruction ID for each declaration:

```typescript
class FindLastUsageVisitor extends ReactiveFunctionVisitor<void> {
  lastUsage: Map<DeclarationId, InstructionId> = new Map();

  override visitPlace(id: InstructionId, place: Place, _state: void): void {
    const previousUsage = this.lastUsage.get(place.identifier.declarationId);
    const lastUsage =
      previousUsage !== undefined
        ? makeInstructionId(Math.max(previousUsage, id))
        : id;
    this.lastUsage.set(place.identifier.declarationId, lastUsage);
  }
}
```

### Phase 2: Transform (Nested Scope Flattening)
The `transformScope` method flattens nested scopes with identical dependencies:

```typescript
override transformScope(
  scopeBlock: ReactiveScopeBlock,
  state: ReactiveScopeDependencies | null,
): Transformed<ReactiveStatement> {
  this.visitScope(scopeBlock, scopeBlock.scope.dependencies);
  if (
    state !== null &&
    areEqualDependencies(state, scopeBlock.scope.dependencies)
  ) {
    return {kind: 'replace-many', value: scopeBlock.instructions};
  } else {
    return {kind: 'keep'};
  }
}
```

### Phase 3: Visit Block (Consecutive Scope Merging)
Within `visitBlock`, the pass:
1. First traverses nested blocks recursively
2. Iterates through instructions, tracking merge candidates
3. Determines if consecutive scopes can merge based on:
   - Identical dependencies, OR
   - Output of first scope is input to second scope (with always-invalidating types)
4. Collects intermediate lvalues and ensures they're only used by the next scope
5. Merges eligible scopes by combining instructions and updating range/declarations

### Key Merging Conditions (`canMergeScopes`):
```typescript
function canMergeScopes(
  current: ReactiveScopeBlock,
  next: ReactiveScopeBlock,
  temporaries: Map<DeclarationId, DeclarationId>,
): boolean {
  // Don't merge scopes with reassignments
  if (current.scope.reassignments.size !== 0 || next.scope.reassignments.size !== 0) {
    return false;
  }
  // Merge scopes whose dependencies are identical
  if (areEqualDependencies(current.scope.dependencies, next.scope.dependencies)) {
    return true;
  }
  // Merge scopes where outputs of previous are inputs of next
  // (with always-invalidating type check)
  // ...
}
```

### Always-Invalidating Types:
```typescript
export function isAlwaysInvalidatingType(type: Type): boolean {
  switch (type.kind) {
    case 'Object': {
      switch (type.shapeId) {
        case BuiltInArrayId:
        case BuiltInObjectId:
        case BuiltInFunctionId:
        case BuiltInJsxId: {
          return true;
        }
      }
      break;
    }
    case 'Function': {
      return true;
    }
  }
  return false;
}
```

## Edge Cases

### Terminals
The pass does not merge across terminals (control flow boundaries).

### Pruned Scopes
Merging stops at pruned scopes.

### Reassignments
Scopes containing reassignments cannot be merged (side-effect ordering concerns).

### Intermediate Reassignments
Non-const StoreLocal instructions between scopes prevent merging.

### Safe Intermediate Instructions
Only certain instruction types are allowed between merged scopes: `BinaryExpression`, `ComputedLoad`, `JSXText`, `LoadGlobal`, `LoadLocal`, `Primitive`, `PropertyLoad`, `TemplateLiteral`, `UnaryExpression`, and const `StoreLocal`.

### Lvalue Usage
Intermediate values must be last-used at or before the next scope to allow merging.

### Non-Invalidating Outputs
If a scope's output may not change when inputs change (e.g., `foo(x) { return x < 10 }` returns same boolean for different x values), that scope cannot be a merge candidate for subsequent scopes.

## TODOs
```typescript
/*
 * TODO LeaveSSA: use IdentifierId for more precise tracking
 * Using DeclarationId is necessary for compatible output but produces suboptimal results
 * in cases where a scope defines a variable, but that version is never read and always
 * overwritten later.
 * see reassignment-separate-scopes.js for example
 */
lastUsage: Map<DeclarationId, InstructionId> = new Map();
```

## Example

### Fixture: `merge-consecutive-scopes-deps-subset-of-decls.js`

**Input:**
```javascript
import {useState} from 'react';

function Component() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <button onClick={() => setCount(count - 1)}>Decrement</button>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

**After MergeReactiveScopesThatInvalidateTogether** (from `yarn snap -p merge-consecutive-scopes-deps-subset-of-decls.js -d`):
```
scope @1 [7:24] dependencies=[count$32:TPrimitive] declarations=[$51_@5] reassignments=[] {
  [8] $35_@1 = Function @context[setCount$33, count$32]  // decrement callback
  [10] $41 = JSXText "Decrement"
  [12] $42_@2 = JSX <button onClick={$35_@1}>{$41}</button>
  [15] $43_@3 = Function @context[setCount$33, count$32]  // increment callback
  [17] $49 = JSXText "Increment"
  [19] $50_@4 = JSX <button onClick={$43_@3}>{$49}</button>
  [22] $51_@5 = JSX <div>{$42_@2}{$50_@4}</div>
}
```

All scopes are merged because they share `count` as a dependency. Without merging, this would have separate scopes for each callback and button element.

**Generated Code:**
```javascript
function Component() {
  const $ = _c(2);
  const [count, setCount] = useState(0);
  let t0;
  if ($[0] !== count) {
    t0 = (
      <div>
        <button onClick={() => setCount(count - 1)}>Decrement</button>
        <button onClick={() => setCount(count + 1)}>Increment</button>
      </div>
    );
    $[0] = count;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}
```

The merged version uses only 2 cache slots instead of potentially 6-8.
