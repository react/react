# mergeOverlappingReactiveScopesHIR

## File
`src/HIR/MergeOverlappingReactiveScopesHIR.ts`

## Purpose
This pass ensures that reactive scope ranges form valid, non-overlapping blocks in the output JavaScript program. It merges reactive scopes that would otherwise be inconsistent with each other due to:

1. **Overlapping ranges**: Scopes whose instruction ranges partially overlap (not disjoint and not nested) must be merged because the compiler cannot produce valid `if-else` memo blocks for overlapping scopes.

2. **Cross-scope mutations**: When an instruction within one scope mutates a value belonging to a different (outer) scope, those scopes must be merged to maintain correctness.

The pass guarantees that after execution, any two reactive scopes are either:
- Entirely disjoint (no common instructions)
- Properly nested (one scope is completely contained within the other)

## Input Invariants
- Reactive scope variables have been inferred (`InferReactiveScopeVariables` pass has run)
- Scopes have been aligned to block scopes (`AlignReactiveScopesToBlockScopesHIR` pass has run)
- Each `Place` may have an associated `ReactiveScope` with a `range` (start/end instruction IDs)
- Scopes may still have overlapping ranges or contain instructions that mutate outer scopes

## Output Guarantees
- **No overlapping scopes**: All reactive scopes either are disjoint or properly nested
- **Consistent mutation boundaries**: Instructions only mutate their "active" scope (the innermost containing scope)
- **Merged scope ranges**: Merged scopes have their ranges extended to cover the union of all constituent scopes
- **Updated references**: All `Place` references have their `identifier.scope` updated to point to the merged scope

## Algorithm

### Phase 1: Collect Scope Information (`collectScopeInfo`)
- Iterates through all instructions and terminals in the function
- Records for each `Place`:
  - The scope it belongs to (`placeScopes` map)
  - When scopes start and end (`scopeStarts` and `scopeEnds` arrays, sorted in descending order by ID)
- Only records scopes with non-empty ranges (`range.start !== range.end`)

### Phase 2: Detect Overlapping Scopes (`getOverlappingReactiveScopes`)
Uses a stack-based traversal to track "active" scopes at each instruction:

1. **For each instruction/terminal**:
   - **Handle scope endings**: Pop completed scopes from the active stack. If a scope ends while other scopes that started later are still active (detected by finding the scope is not at the top of the stack), those scopes overlap and must be merged via `DisjointSet.union()`.

   - **Handle scope starts**: Push new scopes onto the active stack (sorted by end time descending so earlier-ending scopes are at the top). Merge any scopes that have identical start/end ranges.

   - **Handle mutations**: For each operand/lvalue, if it:
     - Has an associated scope
     - Is mutable at the current instruction
     - The scope is active but not at the top of the stack (i.e., an outer scope)

     Then merge all scopes from the mutated outer scope to the top of the stack.

2. **Special case**: Primitive operands in `FunctionExpression` and `ObjectMethod` are skipped.

### Phase 3: Merge Scopes and Rewrite References
1. For each scope in the disjoint set, compute the merged range as the union (min start, max end)
2. Update all `Place.identifier.scope` references to point to the merged "group" scope

## Key Data Structures

### ScopeInfo
```typescript
type ScopeInfo = {
  scopeStarts: Array<{id: InstructionId; scopes: Set<ReactiveScope>}>;
  scopeEnds: Array<{id: InstructionId; scopes: Set<ReactiveScope>}>;
  placeScopes: Map<Place, ReactiveScope>;
};
```

### TraversalState
```typescript
type TraversalState = {
  joined: DisjointSet<ReactiveScope>;  // Union-find for merged scopes
  activeScopes: Array<ReactiveScope>;   // Stack of currently active scopes
};
```

### DisjointSet<ReactiveScope>
A union-find data structure that tracks which scopes should be merged into the same group.

## Edge Cases

### Identical Scope Ranges
When multiple scopes have the exact same start and end, they are automatically merged since they would produce the same reactive block.

### Empty Scopes
Scopes where `range.start === range.end` are skipped entirely.

### Primitive Captures in Functions
When a `FunctionExpression` or `ObjectMethod` captures a primitive operand, it's excluded from scope merging analysis.

### JSX Single-Instruction Scopes
The comment in the code notes this isn't perfect - mutating scopes may get merged with JSX single-instruction scopes.

### Non-Mutating Captures
The pass records both mutating and non-mutating scopes to handle cases where still-mutating values are aliased by inner scopes.

## TODOs
From the comments in the source file, the design constraints arise from the current compiler output design:
- **Instruction ordering is preserved**: If reordering were allowed, disjoint ranges could be produced by reordering mutating instructions
- **One if-else block per scope**: The current design doesn't allow composing a reactive scope from disconnected instruction ranges

## Example

### Fixture: `overlapping-scopes-interleaved.js`

**Input Code:**
```javascript
function foo(a, b) {
  let x = [];
  let y = [];
  x.push(a);
  y.push(b);
}
```

**Before MergeOverlappingReactiveScopesHIR:**
```
[1] $20_@0[1:9] = Array []        // x belongs to scope @0, range [1:9]
[2] x$21_@0[1:9] = StoreLocal...
[3] $23_@1[3:13] = Array []       // y belongs to scope @1, range [3:13]
[4] y$24_@1[3:13] = StoreLocal...
```
Scopes @0 [1:9] and @1 [3:13] overlap: @0 starts at 1, @1 starts at 3, @0 ends at 9, @1 ends at 13. This is invalid.

**After MergeOverlappingReactiveScopesHIR:**
```
[1] $20_@0[1:13] = Array []       // Merged scope @0, range [1:13]
[2] x$21_@0[1:13] = StoreLocal...
[3] $23_@0[1:13] = Array []       // Now also scope @0
[4] y$24_@0[1:13] = StoreLocal...
```

Both `x` and `y` now belong to the same merged scope @0 with range [1:13], producing a single `if-else` memo block in the output.
