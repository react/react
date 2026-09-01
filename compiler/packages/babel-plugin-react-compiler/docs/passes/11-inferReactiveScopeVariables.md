# inferReactiveScopeVariables

## File
`src/ReactiveScopes/InferReactiveScopeVariables.ts`

## Purpose
This is the **1st of 4 passes** that determine how to break a React function into discrete reactive scopes (independently memoizable units of code). Its specific responsibilities are:

1. **Identify operands that mutate together** - Variables that are mutated in the same instruction must be placed in the same reactive scope
2. **Assign a unique ReactiveScope to each group** - Each disjoint set of co-mutating identifiers gets assigned a unique ScopeId
3. **Compute the mutable range** - The scope's range is computed as the union of all member identifiers' mutable ranges

The pass does NOT determine which instructions compute each scope, only which variables belong together.

## Input Invariants
- `InferMutationAliasingEffects` has run - Effects describe mutations, captures, and aliasing
- `InferMutationAliasingRanges` has run - Each identifier has a valid `mutableRange` property
- `InferReactivePlaces` has run - Places are marked as reactive or not
- `RewriteInstructionKindsBasedOnReassignment` has run - Let/Const properly determined
- All instructions have been numbered with valid `InstructionId` values
- Phi nodes are properly constructed at block join points

## Output Guarantees
- Each identifier that is part of a mutable group has its `identifier.scope` property set to a `ReactiveScope` object
- All identifiers in the same scope share the same `ReactiveScope` reference
- The scope's `range` is the union (min start, max end) of all member mutable ranges
- The scope's `range` is validated to be within [1, maxInstruction+1]
- Identifiers that only have single-instruction lifetimes (read once) may not be assigned to a scope unless they allocate

## Algorithm

### Phase 1: Find Disjoint Mutable Values (`findDisjointMutableValues`)

Uses a Union-Find (Disjoint Set) data structure to group identifiers that mutate together:

1. **Handle Phi Nodes**: For each phi in each block:
   - If the phi's result is mutated after creation (mutableRange.end > first instruction in block), union the phi with all its operands
   - This ensures values that flow through control flow and are later mutated are grouped together

2. **Handle Instructions**: For each instruction:
   - Collect mutable operands based on instruction type:
     - If lvalue has extended mutable range OR instruction may allocate, include lvalue
     - For StoreLocal/StoreContext: Include lvalue if it has extended mutable range, include value if mutable
     - For Destructure: Include each pattern operand with extended range, include source if mutable
     - For MethodCall: Include all mutable operands plus the computed property (to keep method resolution in same scope)
     - For other instructions: Include all mutable operands
   - Exclude global variables (mutableRange.start === 0) since they cannot be recreated
   - Union all collected operands together

### Phase 2: Assign Scopes

1. Iterate over all identifiers in the disjoint set using `forEach(item, groupIdentifier)`
2. For each unique group, create a new ReactiveScope:
   - Generate a unique ScopeId from the environment
   - Initialize range from the first member's mutableRange
   - Set up empty dependencies, declarations, reassignments sets
3. For subsequent members of the same group:
   - Expand the scope's range to encompass the member's mutableRange
   - Merge source locations
4. Assign the scope to each identifier: `identifier.scope = scope`
5. Update each identifier's mutableRange to match the scope's range

**Validation**: After scope assignment, validate that all scopes have valid ranges within [1, maxInstruction+1].

## Key Data Structures

### DisjointSet<Identifier>
A Union-Find data structure optimized for grouping items into disjoint sets:

```typescript
class DisjointSet<T> {
  #entries: Map<T, T>;  // Maps each item to its parent (root points to self)

  union(items: Array<T>): void;     // Merge items into one set
  find(item: T): T | null;          // Find the root of item's set (with path compression)
  forEach(fn: (item, group) => void): void;  // Iterate all items with their group root
}
```

Path compression is used during `find()` to flatten the tree structure, improving subsequent lookup performance.

### ReactiveScope
```typescript
type ReactiveScope = {
  id: ScopeId;
  range: MutableRange;              // [start, end) instruction range
  dependencies: Set<ReactiveScopeDependency>;  // Inputs (populated later)
  declarations: Map<IdentifierId, ReactiveScopeDeclaration>;  // Outputs (populated later)
  reassignments: Set<Identifier>;   // Reassigned variables (populated later)
  earlyReturnValue: {...} | null;   // For scopes with early returns
  merged: Set<ScopeId>;             // IDs of scopes merged into this one
  loc: SourceLocation;
};
```

## Edge Cases

### Global Variables
Excluded from scopes (mutableRange.start === 0) since they cannot be recreated during memoization.

### Phi Nodes After Mutation
When a phi's result is mutated after the join point, all phi operands must be in the same scope to ensure the mutation can be recomputed correctly.

### MethodCall Property Resolution
The computed property load for a method call is explicitly added to the same scope as the call itself.

### Allocating Instructions
Instructions that allocate (Array, Object, JSX, etc.) add their lvalue to the scope even if the lvalue has a single-instruction range.

### Single-Instruction Ranges
Values with range `[n, n+1)` (used exactly once) are only included if they allocate, otherwise they're just read.

### enableForest Config
When enabled, phi operands are unconditionally unioned with the phi result (even without mutation after the phi).

## TODOs
1. `// TODO: improve handling of module-scoped variables and globals` - The current approach excludes globals entirely, but a more nuanced handling could be beneficial.

2. Known issue with aliasing and mutable lifetimes (from header comments):
```javascript
let x = {};
let y = [];
x.y = y; // RHS is not considered mutable here bc not further mutation
mutate(x); // bc y is aliased here, it should still be considered mutable above
```
This suggests the pass may miss some co-mutation relationships when aliasing is involved.

## Example

### Fixture: `reactive-scope-grouping.js`

**Input:**
```javascript
function foo() {
  let x = {};
  let y = [];
  let z = {};
  y.push(z);  // y and z co-mutate (z captured into y)
  x.y = y;    // x and y co-mutate (y captured into x)
  return x;
}
```

**After InferReactiveScopeVariables:**
```
[1] mutate? $19_@0[1:14] = Object { }     // x's initial object, scope @0
[2] store $21_@0[1:14] = StoreLocal x     // x in scope @0
[3] mutate? $22_@1[3:11] = Array []       // y's array, scope @1
[4] store $24_@1[3:11] = StoreLocal y     // y in scope @1
[5] mutate? $25_@2 = Object { }           // z's object, scope @2
[10] MethodCall y.push(z)                 // Mutates y, captures z
[13] PropertyStore x.y = y                // Mutates x, captures y
```

The `y.push(z)` joins y and z into scope @1, and `x.y = y` joins x and y into scope @0. Because y is now in @0, and z was captured into y, ultimately x, y, and z all end up in the same scope @0.

**Compiled Output:**
```javascript
function foo() {
  const $ = _c(1);
  let x;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    x = {};
    const y = [];
    const z = {};
    y.push(z);
    x.y = y;
    $[0] = x;
  } else {
    x = $[0];
  }
  return x;
}
```

All three objects (x, y, z) are created within the same memoization block because they co-mutate and could potentially alias each other.
