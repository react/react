# alignMethodCallScopes

## File
`src/ReactiveScopes/AlignMethodCallScopes.ts`

## Purpose
Ensures that `MethodCall` instructions and their associated `PropertyLoad` instructions (which load the method being called) have consistent scope assignments. The pass enforces one of two invariants:
1. Both the MethodCall lvalue and the property have the **same** reactive scope
2. **Neither** has a reactive scope

This alignment is critical because the PropertyLoad and MethodCall are semantically a single operation (`receiver.method(args)`) and must be memoized together as a unit. If they had different scopes, the generated code would incorrectly try to memoize the property load separately from the method call, which could break correctness.

## Input Invariants
- The function has been converted to HIR form
- `inferReactiveScopeVariables` has already run, assigning initial reactive scopes to identifiers based on mutation analysis
- Each instruction's lvalue has an `identifier.scope` that is either a `ReactiveScope` or `null`
- For `MethodCall` instructions, the `value.property` field contains a `Place` referencing the loaded method

## Output Guarantees
After this pass runs:
- For every `MethodCall` instruction in the function:
  - If the lvalue has a scope AND the property has a scope, they point to the **same merged scope**
  - If only the lvalue has a scope, the property's scope is set to match the lvalue's scope
  - If only the property has a scope, the property's scope is set to `null` (so neither has a scope)
- Merged scopes have their `range` extended to cover the union of the original scopes' ranges
- Nested functions (FunctionExpression, ObjectMethod) are recursively processed

## Algorithm

### Phase 1: Collect Scope Relationships
```
For each instruction in all blocks:
  If instruction is a MethodCall:
    lvalueScope = instruction.lvalue.identifier.scope
    propertyScope = instruction.value.property.identifier.scope

    If both have scopes:
      Record that these scopes should be merged (using DisjointSet.union)
    Else if only lvalue has scope:
      Record that property should be assigned to lvalueScope
    Else if only property has scope:
      Record that property should be assigned to null (no scope)

  If instruction is FunctionExpression or ObjectMethod:
    Recursively process the nested function
```

### Phase 2: Merge Scopes
```
For each merged scope group:
  Pick a "root" scope
  Extend root's range to cover all merged scopes:
    root.range.start = min(all scope start points)
    root.range.end = max(all scope end points)
```

### Phase 3: Apply Changes
```
For each instruction:
  If lvalue was recorded for remapping:
    Set identifier.scope to the mapped value
  Else if identifier has a scope that was merged:
    Set identifier.scope to the merged root scope
```

## Key Data Structures

1. **`scopeMapping: Map<IdentifierId, ReactiveScope | null>`**
   - Maps property identifier IDs to their new scope assignment
   - Value of `null` means the scope should be removed

2. **`mergedScopes: DisjointSet<ReactiveScope>`**
   - Union-find data structure tracking scopes that need to be merged
   - Used when both MethodCall and property have different scopes

3. **`ReactiveScope`** (from HIR)
   - Contains `range: { start: InstructionId, end: InstructionId }`
   - The range defines which instructions are part of the scope

## Edge Cases

### Both Have the Same Scope Already
No action needed (implicit in the logic).

### Nested Functions
The pass recursively processes `FunctionExpression` and `ObjectMethod` instructions to handle closures.

### Multiple MethodCalls Sharing Scopes
The DisjointSet handles transitive merging - if A merges with B, and B merges with C, all three end up in the same scope.

### Property Without Scope, MethodCall Without Scope
No action needed (both already aligned at `null`).

## TODOs
There are no explicit TODO comments in the source code.

## Example

### Fixture: `alias-capture-in-method-receiver.js`

**Source code:**
```javascript
function Component() {
  let a = someObj();
  let x = [];
  x.push(a);
  return [x, a];
}
```

**Before AlignMethodCallScopes:**
```
[7] store $24_@1[4:10]:TFunction = PropertyLoad capture $23_@1.push
[9] mutate? $26:TPrimitive = MethodCall store $23_@1.read $24_@1(capture $25)
```
- PropertyLoad result `$24_@1` has scope `@1`
- MethodCall result `$26` has no scope (`null`)

**After AlignMethodCallScopes:**
```
[7] store $24[4:10]:TFunction = PropertyLoad capture $23_@1.push
[9] mutate? $26:TPrimitive = MethodCall store $23_@1.read $24(capture $25)
```
- PropertyLoad result `$24` now has **no scope** (the `_@1` suffix removed)
- MethodCall result `$26` still has no scope

**Why this matters:**
Without this alignment, later passes might try to memoize the `.push` property load separately from the actual `push()` call. This would be incorrect because:
1. Reading a method from an object and calling it are semantically one operation
2. The property load's value (the bound method) is only valid immediately when called on the same receiver
3. Separate memoization could lead to stale method references or incorrect this-binding
