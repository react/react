# propagateScopeDependenciesHIR

## File
`src/HIR/PropagateScopeDependenciesHIR.ts`

## Purpose
The `propagateScopeDependenciesHIR` pass is responsible for computing and assigning the **dependencies** for each reactive scope in the compiled function. Dependencies are the external values that a scope reads, which determine when the scope needs to re-execute. This is a critical step for memoization correctness - the compiler must track exactly which values a scope depends on so it can generate proper cache invalidation checks.

The pass also populates:
- `scope.dependencies` - The set of `ReactiveScopeDependency` objects the scope reads
- `scope.declarations` - Values declared within the scope that are used outside it

## Input Invariants
- Reactive scopes must be established (pass runs after `BuildReactiveScopeTerminalsHIR`)
- The function must be in SSA form
- `InferMutationAliasingRanges` must have run to establish when values are being mutated
- `InferReactivePlaces` marks which identifiers are reactive
- Scope ranges have been aligned and normalized by earlier passes

## Output Guarantees
After this pass completes:

1. Each `ReactiveScope.dependencies` contains the minimal set of dependencies that:
   - Were declared before the scope started
   - Are read within the scope
   - Are not ref values (which are always mutable)
   - Are not object methods (which get codegen'd back into object literals)

2. Each `ReactiveScope.declarations` contains identifiers that:
   - Are assigned within the scope
   - Are used outside the scope (need to be exposed as scope outputs)

3. Property load chains are resolved to their root identifiers with paths (e.g., `props.user.name` becomes `{identifier: props, path: ["user", "name"]}`)

4. Optional chains are handled correctly, distinguishing between `a?.b` and `a.b` access types

## Algorithm

### Phase 1: Build Sidemaps

1. **findTemporariesUsedOutsideDeclaringScope**: Identifies temporaries that are used outside the scope where they were declared (cannot be hoisted/reordered safely)

2. **collectTemporariesSidemap**: Creates a mapping from temporary IdentifierIds to their source `ReactiveScopeDependency`. For example:
   ```
   $0 = LoadLocal 'a'
   $1 = PropertyLoad $0.'b'
   ```
   Maps `$1.id` to `{identifier: a, path: [{property: 'b', optional: false}]}`

3. **collectOptionalChainSidemap**: Traverses optional chain blocks to map temporaries within optional chains to their full optional dependency path

4. **collectHoistablePropertyLoads**: Uses CFG analysis to determine which property loads can be safely hoisted

### Phase 2: Collect Dependencies

The `collectDependencies` function traverses the HIR, maintaining a stack of active scopes:

1. **Scope Entry/Exit**: When entering a scope terminal, push a new dependency array. When exiting, propagate collected dependencies to parent scopes if valid.

2. **Instruction Processing**: For each instruction:
   - Declare the lvalue with its instruction id and current scope
   - Visit operands to record them as potential dependencies
   - Handle special cases like `StoreLocal` (tracks reassignments), `Destructure`, `PropertyLoad`, etc.

3. **Dependency Validation** (`#checkValidDependency`):
   - Skip ref values (`isRefValueType`)
   - Skip object methods (`isObjectMethodType`)
   - Only include if declared before scope start

### Phase 3: Derive Minimal Dependencies

For each scope, use `ReactiveScopeDependencyTreeHIR` to:
1. Build a tree from hoistable property loads
2. Add all collected dependencies to the tree
3. Truncate dependencies at their maximal safe-to-evaluate subpath
4. Derive the minimal set (removing redundant nested dependencies)

## Key Data Structures

### ReactiveScopeDependency
```typescript
type ReactiveScopeDependency = {
  identifier: Identifier;        // Root identifier
  reactive: boolean;             // Whether the value is reactive
  path: DependencyPathEntry[];   // Chain of property accesses
}
```

### DependencyPathEntry
```typescript
type DependencyPathEntry = {
  property: PropertyLiteral;  // Property name
  optional: boolean;          // Is this `?.` access?
}
```

### DependencyCollectionContext
Maintains:
- `#declarations`: Map of DeclarationId to {id, scope} recording where each value was declared
- `#reassignments`: Map of Identifier to latest assignment info
- `#scopes`: Stack of currently active ReactiveScopes
- `#dependencies`: Stack of dependency arrays (one per active scope)
- `#temporaries`: Sidemap for resolving property loads

### ReactiveScopeDependencyTreeHIR
A tree structure for efficient dependency deduplication that stores hoistable objects, tracks access types, and computes minimal dependencies.

## Edge Cases

### Values Used Outside Declaring Scope
If a temporary is used outside its declaring scope, it cannot be tracked in the sidemap because reordering the read would be invalid.

### Ref.current Access
Accessing `ref.current` is treated specially - the dependency is truncated to just `ref`.

### Optional Chains
Optional chains like `a?.b?.c` produce different dependency paths than `a.b.c`. The pass distinguishes them and may merge optional loads into unconditional ones when control flow proves the object is non-null.

### Inner Functions
Dependencies from inner functions are collected recursively but with special handling for context variables.

### Phi Nodes
When a value comes from multiple control flow paths, optional chain dependencies from phi operands are also visited.

## TODOs
1. Line 374-375: `// TODO(mofeiZ): understand optional chaining` - More documentation needed for optional chain handling

## Example

### Fixture: `reactive-control-dependency-if.js`

**Input:**
```javascript
function Component(props) {
  let x;
  if (props.cond) {
    x = 1;
  } else {
    x = 2;
  }
  return [x];
}
```

**Before PropagateScopeDependenciesHIR:**
```
Scope scope @0 [12:15] dependencies=[] declarations=[] reassignments=[] block=bb9
```

**After PropagateScopeDependenciesHIR:**
```
Scope scope @0 [12:15] dependencies=[x$24:TPrimitive] declarations=[$26_@0] reassignments=[] block=bb9
```

The pass identified that:
- The scope at `[x]` depends on `x$24` (the phi node result from the if/else branches)
- Even though `x` is assigned to constants (1 or 2), its value depends on the reactive control flow condition `props.cond`
- The scope declares `$26_@0` (the array output)
