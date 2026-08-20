# alignObjectMethodScopes

## File
`src/ReactiveScopes/AlignObjectMethodScopes.ts`

## Purpose
Ensures that object method values and their enclosing object expressions share the same reactive scope. This is critical for code generation because JavaScript requires object method definitions to be inlined within their containing object literals. If the object method and object expression were in different reactive scopes (which map to different memoization blocks), the generated code would be invalid since you cannot reference an object method defined in one block from an object literal in a different block.

From the file's documentation:
> "To produce a well-formed JS program in Codegen, object methods and object expressions must be in the same ReactiveBlock as object method definitions must be inlined."

## Input Invariants
- Reactive scopes have been inferred: This pass runs after `InferReactiveScopeVariables`
- ObjectMethod and ObjectExpression have non-null scopes: The pass asserts this with an invariant check
- Scopes are disjoint across functions: The pass assumes that scopes do not overlap between parent and nested functions

## Output Guarantees
- ObjectMethod and ObjectExpression share the same scope: Any ObjectMethod used as a property in an ObjectExpression will have its scope merged with the ObjectExpression's scope
- Merged scope covers both ranges: The resulting merged scope's range is expanded to cover the minimum start and maximum end of all merged scopes
- All identifiers are repointed: All identifiers whose scopes were merged are updated to point to the canonical root scope
- Inner functions are also processed: The pass recursively handles nested ObjectMethod and FunctionExpression values

## Algorithm

### Phase 1: Find Scopes to Merge (`findScopesToMerge`)
1. Iterate through all blocks and instructions in the function
2. Track all ObjectMethod declarations in a set by their lvalue identifier
3. When encountering an ObjectExpression, check each operand:
   - If an operand's identifier was previously recorded as an ObjectMethod declaration
   - Get the scope of both the ObjectMethod operand and the ObjectExpression lvalue
   - Assert both scopes are non-null
   - Union these two scopes together in a DisjointSet data structure

### Phase 2: Merge and Repoint Scopes (`alignObjectMethodScopes`)
1. Recursively process inner functions first (ObjectMethod and FunctionExpression values)
2. Canonicalize the DisjointSet to get a mapping from each scope to its root
3. **Step 1 - Merge ranges**: For each scope that maps to a different root:
   - Expand the root's range to encompass both the original range and the merged scope's range
   - `root.range.start = min(scope.range.start, root.range.start)`
   - `root.range.end = max(scope.range.end, root.range.end)`
4. **Step 2 - Repoint identifiers**: For each instruction's lvalue:
   - If the identifier has a scope that was merged
   - Update the identifier's scope reference to point to the canonical root

## Key Data Structures

1. **DisjointSet<ReactiveScope>** - A union-find data structure that tracks which scopes should be merged together. Uses path compression for efficient `find()` operations.

2. **Set<Identifier>** - Tracks which identifiers are ObjectMethod declarations, used to identify when an ObjectExpression operand is an object method.

3. **ReactiveScope** - Contains:
   - `id: ScopeId` - Unique identifier
   - `range: MutableRange` - Start and end instruction IDs
   - `dependencies` - Inputs to the scope
   - `declarations` - Values produced by the scope

4. **MutableRange** - Has `start` and `end` InstructionId fields that define the scope's extent.

## Edge Cases

### Nested Object Methods
When an object method itself contains another object with methods, the pass recursively processes inner functions first before handling the outer function's scopes.

### Multiple Object Methods in Same Object
If an object has multiple method properties, all their scopes will be merged with the object's scope through the DisjointSet.

### Object Methods in Conditional Expressions
Object methods inside ternary expressions still need scope alignment to ensure the method and its containing object are in the same reactive block.

### Method Call After Object Creation
The pass works in conjunction with `AlignMethodCallScopes` (which runs immediately before) to ensure that method calls on objects with object methods are also properly scoped.

## TODOs
None explicitly marked in the source file.

## Example

### Fixture: `object-method-shorthand.js`

**Input:**
```javascript
function Component() {
  let obj = {
    method() {
      return 1;
    },
  };
  return obj.method();
}
```

**Before AlignObjectMethodScopes:**
```
InferReactiveScopeVariables:
  [1] mutate? $12_@0:TObjectMethod = ObjectMethod ...    // scope @0
  [2] mutate? $14_@1[2:7]:TObject = Object { method: ... } // scope @1 (range 2:7)
```
The ObjectMethod `$12` is in scope `@0` while the ObjectExpression `$14` is in scope `@1` with range `[2:7]`.

**After AlignObjectMethodScopes:**
```
AlignObjectMethodScopes:
  [1] mutate? $12_@0[1:7]:TObjectMethod = ObjectMethod ... // scope @0, range now 1:7
  [2] mutate? $14_@0[1:7]:TObject = Object { method: ... } // also scope @0, range 1:7
```
Both identifiers are in the same scope `@0`, and the scope's range has been expanded to `[1:7]` to cover both instructions.

**Final Generated Code:**
```javascript
function Component() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    const obj = {
      method() {
        return 1;
      },
    };
    t0 = obj.method();
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}
```

The object literal with its method and the subsequent method call are all inside the same memoization block, producing valid JavaScript where the method definition is inlined within the object literal.
