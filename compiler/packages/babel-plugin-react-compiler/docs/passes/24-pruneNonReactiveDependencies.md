# pruneNonReactiveDependencies

## File
`src/ReactiveScopes/PruneNonReactiveDependencies.ts`

## Purpose
This pass removes dependencies from reactive scopes that are guaranteed to be **non-reactive** (i.e., their values cannot change between renders). This optimization reduces unnecessary memoization invalidations by ensuring scopes only depend on values that can actually change.

The pass complements `PropagateScopeDependencies`, which infers dependencies without considering reactivity. This subsequent pruning step filters out dependencies that are semantically constant.

## Input Invariants
- The function has been converted to a ReactiveFunction structure
- `InferReactivePlaces` has annotated places with `{reactive: true}` where values can change
- Each `ReactiveScopeBlock` has a `scope.dependencies` set populated by `PropagateScopeDependenciesHIR`
- Type inference has run, so identifiers have type information for `isStableType` checks

## Output Guarantees
- **Non-reactive dependencies removed**: All dependencies in `scope.dependencies` are reactive after this pass
- **Scope outputs marked reactive if needed**: If a scope has any reactive dependencies remaining, all its outputs are marked reactive
- **Stable types remain non-reactive through property loads**: When loading properties from stable types (like `useReducer` dispatch functions), the result is not added to the reactive set

## Algorithm

### Phase 1: Collect Reactive Identifiers
The `collectReactiveIdentifiers` helper builds the initial set of reactive identifiers by:
1. Visiting all places in the ReactiveFunction
2. Adding any place marked `{reactive: true}` to the set
3. For pruned scopes, adding declarations that are not primitives and not stable ref types

### Phase 2: Propagate Reactivity and Prune Dependencies
The main `Visitor` class traverses the ReactiveFunction and:

1. **For Instructions** - Propagates reactivity through data flow:
   - `LoadLocal`: If source is reactive, mark the lvalue as reactive
   - `StoreLocal`: If source value is reactive, mark both the local variable and lvalue as reactive
   - `Destructure`: If source is reactive, mark all pattern operands as reactive (except stable types)
   - `PropertyLoad`: If object is reactive AND result is not a stable type, mark result as reactive
   - `ComputedLoad`: If object OR property is reactive, mark result as reactive

2. **For Scopes** - Prunes non-reactive dependencies and propagates outputs:
   - Delete each dependency from `scope.dependencies` if its identifier is not in the reactive set
   - If any dependencies remain after pruning, mark all scope outputs as reactive

### Key Insight: Stable Types
The pass leverages `isStableType` to prevent reactivity from flowing through certain React-provided stable values:

```typescript
function isStableType(id: Identifier): boolean {
  return (
    isSetStateType(id) ||       // useState setter
    isSetActionStateType(id) || // useActionState setter
    isDispatcherType(id) ||     // useReducer dispatcher
    isUseRefType(id) ||         // useRef result
    isStartTransitionType(id) ||// useTransition startTransition
    isSetOptimisticType(id)     // useOptimistic setter
  );
}
```

## Edge Cases

### Unmemoized Values Spanning Hook Calls
A value created before a hook call and mutated after cannot be memoized. However, if it's non-reactive, it still should not appear as a dependency of downstream scopes.

### Stable Types from Reactive Containers
When `useReducer` returns `[state, dispatch]`, `state` is reactive but `dispatch` is stable. The pass correctly handles this.

### Pruned Scopes with Reactive Content
The `CollectReactiveIdentifiers` pass also examines pruned scopes and adds their non-primitive, non-stable-ref declarations to the reactive set.

### Transitive Reactivity Through Scopes
When a scope retains at least one reactive dependency, ALL its outputs become reactive.

## TODOs
None in the source file.

## Example

### Fixture: `unmemoized-nonreactive-dependency-is-pruned-as-dependency.js`

**Input:**
```javascript
function Component(props) {
  const x = [];
  useNoAlias();
  mutate(x);

  return <div>{x}</div>;
}
```

**Before PruneNonReactiveDependencies:**
```
scope @2 dependencies=[x$15_@0:TObject<BuiltInArray>] declarations=[$23_@2]
```

**After PruneNonReactiveDependencies:**
```
scope @2 dependencies=[] declarations=[$23_@2]
```

The dependency on `x` is removed because `x` is created locally and therefore non-reactive.

### Fixture: `useReducer-returned-dispatcher-is-non-reactive.js`

**Input:**
```javascript
function f() {
  const [state, dispatch] = useReducer();

  const onClick = () => {
    dispatch();
  };

  return <div onClick={onClick} />;
}
```

**Generated Code:**
```javascript
function f() {
  const $ = _c(1);
  const [, dispatch] = useReducer();
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    const onClick = () => {
      dispatch();
    };
    t0 = <div onClick={onClick} />;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}
```

The `onClick` function only captures `dispatch`, which is a stable type. Therefore, `onClick` is non-reactive, and the JSX element can be memoized with zero dependencies.
