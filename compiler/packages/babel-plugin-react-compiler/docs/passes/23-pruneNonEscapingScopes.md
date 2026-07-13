# pruneNonEscapingScopes

## File
`src/ReactiveScopes/PruneNonEscapingScopes.ts`

## Purpose
This pass prunes (removes) reactive scopes whose outputs do not "escape" the component and therefore do not need to be memoized. A value "escapes" in two ways:

1. **Returned from the function** - The value is directly returned or transitively aliased by a return value
2. **Passed to a hook** - Any value passed as an argument to a hook may be stored by React internally (e.g., the closure passed to `useEffect`)

The key insight is that values which never escape the component boundary can be safely recreated on each render without affecting the behavior of consumers.

## Input Invariants
- The input is a `ReactiveFunction` after scope blocks have been identified
- Reactive scopes have been assigned to instructions
- The pass runs after `BuildReactiveFunction` and `PruneUnusedLabels`, before `PruneNonReactiveDependencies`

## Output Guarantees
- **Scopes with non-escaping outputs are removed** - Their instructions are inlined back into the parent scope/function body
- **Scopes with escaping outputs are retained** - Values that escape via return or hook arguments remain memoized
- **Transitive dependencies of escaping scopes are preserved** - If an escaping scope depends on a non-escaping value, that value's scope is also retained to prevent unnecessary invalidation
- **`FinishMemoize` instructions are marked `pruned=true`** - When a scope is pruned, the associated memoization instructions are flagged

## Algorithm

### Phase 1: Build the Dependency Graph
Using `CollectDependenciesVisitor`, build:
- **Identifier nodes** - Each node tracks memoization level, dependencies, scopes, and whether ultimately memoized
- **Scope nodes** - Each scope tracks its dependencies
- **Escaping values** - Identifiers that escape via return or hook arguments

### Phase 2: Classify Memoization Levels
Each instruction value is classified:
- `Memoized`: Arrays, objects, function calls, `new` expressions - always potentially aliasing
- `Conditional`: Conditional/logical expressions, property loads - memoized only if dependencies are memoized
- `Unmemoized`: JSX elements (when `memoizeJsxElements` is false), DeclareLocal
- `Never`: Primitives, LoadGlobal, binary/unary expressions - can be cheaply compared

### Phase 3: Compute Memoized Identifiers
`computeMemoizedIdentifiers()` performs a graph traversal starting from escaping values:
- For each escaping value, recursively visit its dependencies
- Mark values and their scopes based on memoization level
- When marking a scope, force-memoize all its dependencies

### Phase 4: Prune Scopes
`PruneScopesTransform` visits each scope block:
- If any scope output is in the memoized set, keep the scope
- If no outputs are memoized, replace the scope block with its inlined instructions

## Edge Cases

### Interleaved Mutations
```javascript
const a = [props.a];  // independently memoizable, non-escaping
const b = [];
const c = {};
c.a = a;              // c captures a, but c doesn't escape
b.push(props.b);      // b escapes via return
return b;
```
Here `a` does not directly escape, but it is a dependency of the scope containing `b`. The algorithm correctly identifies that `a`'s scope must be preserved.

### Hook Arguments Escape
Values passed to hooks are treated as escaping because hooks may store references internally.

### JSX Special Handling
JSX elements are marked as `Unmemoized` by default because React.memo() can handle dynamic memoization.

### noAlias Functions
If a function signature indicates `noAlias === true`, its arguments are not treated as escaping.

### Reassignments
When a scope reassigns a variable, the scope is added as a dependency of that variable.

## TODOs
None explicitly in the source file.

## Example

### Fixture: `escape-analysis-non-escaping-interleaved-allocating-dependency.js`

**Input:**
```javascript
function Component(props) {
  const a = [props.a];

  const b = [];
  const c = {};
  c.a = a;
  b.push(props.b);

  return b;
}
```

**Output:**
```javascript
function Component(props) {
  const $ = _c(5);
  let t0;
  if ($[0] !== props.a) {
    t0 = [props.a];
    $[0] = props.a;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const a = t0;  // a is memoized even though it doesn't escape directly

  let b;
  if ($[2] !== a || $[3] !== props.b) {
    b = [];
    const c = {};      // c is NOT memoized - it doesn't escape
    c.a = a;
    b.push(props.b);
    $[2] = a;
    $[3] = props.b;
    $[4] = b;
  } else {
    b = $[4];
  }
  return b;
}
```

Key observations:
- `a` is memoized because it's a dependency of the scope containing `b`
- `c` is not separately memoized because it doesn't escape
- `b` is memoized because it's returned
