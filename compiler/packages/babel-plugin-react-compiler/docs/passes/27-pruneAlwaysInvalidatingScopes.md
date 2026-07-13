# pruneAlwaysInvalidatingScopes

## File
`src/ReactiveScopes/PruneAlwaysInvalidatingScopes.ts`

## Purpose
This pass identifies and prunes reactive scopes whose dependencies will *always* invalidate on every render, making memoization pointless. Specifically, it tracks values that are guaranteed to be new allocations (arrays, objects, JSX, new expressions) and checks if those values are used outside of any memoization scope. When a downstream scope depends on such an unmemoized always-invalidating value, the scope is pruned because it would re-execute on every render anyway.

The optimization avoids wasted comparisons in the generated code. Without this pass, the compiler would emit dependency checks for scopes that will never cache-hit, adding runtime overhead with no benefit. By converting these scopes to `pruned-scope` nodes, the codegen emits the instructions inline without memoization guards.

## Input Invariants
- The pass expects a `ReactiveFunction` with scopes already formed
- Scopes should have their `dependencies` populated with the identifiers they depend on
- The pass runs after `MergeReactiveScopesThatInvalidateTogether`
- Hook calls have already caused scope flattening via `FlattenScopesWithHooksOrUseHIR`

## Output Guarantees
- Scopes that depend on unmemoized always-invalidating values are converted to `pruned-scope` nodes
- The `unmemoizedValues` set correctly propagates through `StoreLocal`/`LoadLocal` instructions
- All declarations and reassignments within pruned scopes that are themselves always-invalidating are added to `unmemoizedValues`, enabling cascading pruning of downstream scopes

## Algorithm

The pass uses a `ReactiveFunctionTransform` visitor with two key methods:

### 1. `transformInstruction` - Tracks always-invalidating values:

```typescript
switch (value.kind) {
  case 'ArrayExpression':
  case 'ObjectExpression':
  case 'JsxExpression':
  case 'JsxFragment':
  case 'NewExpression': {
    if (lvalue !== null) {
      this.alwaysInvalidatingValues.add(lvalue.identifier);
      if (!withinScope) {
        this.unmemoizedValues.add(lvalue.identifier);  // Key: only if outside a scope
      }
    }
    break;
  }
  // Also propagates through StoreLocal and LoadLocal
}
```

### 2. `transformScope` - Prunes scopes with unmemoized dependencies:

```typescript
for (const dep of scopeBlock.scope.dependencies) {
  if (this.unmemoizedValues.has(dep.identifier)) {
    // Propagate unmemoized status to scope outputs
    for (const [_, decl] of scopeBlock.scope.declarations) {
      if (this.alwaysInvalidatingValues.has(decl.identifier)) {
        this.unmemoizedValues.add(decl.identifier);
      }
    }
    return {
      kind: 'replace',
      value: {
        kind: 'pruned-scope',
        scope: scopeBlock.scope,
        instructions: scopeBlock.instructions,
      },
    };
  }
}
```

## Edge Cases

### Function Calls Not Considered Always-Invalidating
The pass optimistically assumes function calls may return primitives, so `makeArray()` doesn't trigger pruning even though it might return a new array.

### Conditional Allocations
Code like `x = cond ? [] : 42` doesn't trigger pruning because the value might be a primitive.

### Propagation Through Locals
The pass correctly tracks values through `StoreLocal` and `LoadLocal` to handle variable reassignments and loads.

### Cascading Pruning
When a scope is pruned, its always-invalidating outputs become unmemoized, potentially causing downstream scopes to be pruned as well.

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

**After PruneAlwaysInvalidatingScopes** (from `yarn snap -p prune-scopes-whose-deps-invalidate-array.js -d`):
```
<pruned> scope @0 [1:14] dependencies=[] declarations=[x$21_@0] reassignments=[] {
  [2] $20_@0 = Array []
  [3] StoreLocal Const x$21_@0 = $20_@0
  [4] $23 = LoadGlobal import { useHook }
  [6] $24_@1 = Call $23()       // Hook flattens scope
  [7] break bb9 (implicit)
  [8] $25_@0 = LoadLocal x$21_@0
  [9] $26 = PropertyLoad $25_@0.push
  [10] $27 = LoadLocal props$19
  [11] $28 = PropertyLoad $27.value
  [12] $29 = MethodCall $25_@0.$26($28)
}
[14] $30 = LoadLocal x$21_@0
<pruned> scope @2 [15:23] dependencies=[x$21_@0:TObject<BuiltInArray>] declarations=[$35_@3] {
  [16] $31_@2 = Array [$30]
  [18] StoreLocal Const y$32 = $31_@2
  [19] $34 = LoadLocal y$32
  [21] $35_@3 = Array [$34]
}
[23] return $35_@3
```

Key observations:
- Scope @0 is pruned because the hook call (`useHook()`) flattens it (hook rules prevent memoization around hooks)
- `x` is an `ArrayExpression` created in the pruned scope @0, making it unmemoized
- Scope @2 depends on `x$21_@0` which is unmemoized and always-invalidating (it's an array)
- Therefore, scope @2 is also pruned - cascading pruning

**Generated Code:**
```javascript
function Component(props) {
  const x = [];
  useHook();
  x.push(props.value);
  const y = [x];
  return [y];
}
```

The output matches the input because all memoization was pruned - the code runs unconditionally on every render.
