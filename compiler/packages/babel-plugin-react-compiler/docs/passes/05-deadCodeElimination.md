# deadCodeElimination

## File
`src/Optimization/DeadCodeElimination.ts`

## Purpose
Eliminates instructions whose values are unused, reducing generated code size. The pass performs mark-and-sweep analysis to identify and remove dead code while preserving side effects and program semantics.

## Input Invariants
- Must run after `InferMutationAliasingEffects` because "dead" code may still affect effect inference
- HIR is in SSA form with phi nodes
- Unreachable blocks are already pruned during HIR construction

## Output Guarantees
- All instructions with unused lvalues (that are safe to prune) are removed
- Unused phi nodes are deleted
- Unused context variables are removed from `fn.context`
- Destructuring patterns are rewritten to remove unused bindings
- `StoreLocal` instructions with unused initializers are converted to `DeclareLocal`

## Algorithm
Two-phase mark-and-sweep with fixed-point iteration for loops:

**Phase 1: Mark (findReferencedIdentifiers)**
1. Detect if function has back-edges (loops)
2. Iterate blocks in reverse postorder (successors before predecessors) to visit usages before declarations
3. For each block:
   - Mark all terminal operands as referenced
   - Process instructions in reverse order:
     - If lvalue is used OR instruction is not pruneable, mark the lvalue and all operands as referenced
     - Special case for `StoreLocal`: only mark initializer if the SSA lvalue is actually read
   - Mark phi operands if the phi result is used
4. If loops exist and new identifiers were marked, repeat until fixed point

**Phase 2: Sweep**
1. Remove unused phi nodes from each block
2. Remove instructions with unused lvalues using `retainWhere`
3. Rewrite retained instructions:
   - **Array destructuring**: Replace unused elements with holes, truncate trailing holes
   - **Object destructuring**: Remove unused properties (only if rest element is unused or absent)
   - **StoreLocal**: Convert to `DeclareLocal` if initializer value is never read
4. Remove unused context variables

## Key Data Structures
- **State class**: Tracks referenced identifiers
  - `identifiers: Set<IdentifierId>` - SSA-specific usages
  - `named: Set<string>` - Named variable usages (any version)
  - `isIdOrNameUsed()` - Checks if identifier or any version of named variable is used
  - `isIdUsed()` - Checks if specific SSA id is used
- **hasBackEdge/findBlocksWithBackEdges**: Detect loops requiring fixed-point iteration

## Edge Cases
- **Preserved even if unused:**
  - `debugger` statements (to not break debugging workflows)
  - Call expressions and method calls (may have side effects)
  - Await expressions
  - Store operations (ComputedStore, PropertyStore, StoreGlobal)
  - Delete operations (ComputedDelete, PropertyDelete)
  - Iterator operations (GetIterator, IteratorNext, NextPropertyOf)
  - Context operations (LoadContext, DeclareContext, StoreContext)
  - Memoization markers (StartMemoize, FinishMemoize)

- **SSR mode special case:**
  - In SSR mode, unused `useState`, `useReducer`, and `useRef` hooks can be removed

- **Object destructuring with rest:**
  - Cannot remove unused properties if rest element is used (would change rest's value)

- **Block value instructions:**
  - Last instruction of value blocks (not 'block' kind) is never pruned as it's the block's value

## TODOs
- "TODO: we could be more precise and make this conditional on whether any arguments are actually modified" (for mutating instructions)

## Example

**Input:**
```javascript
function Component(props) {
  const _ = 42;
  return props.value;
}
```

**After DeadCodeElimination:**
The `const _ = 42` assignment is removed since `_` is never used:
```javascript
function Component(props) {
  return props.value;
}
```

**Array destructuring example:**

Input:
```javascript
function foo(props) {
  const [x, unused, y] = props.a;
  return x + y;
}
```

Output (middle element becomes a hole):
```javascript
function foo(props) {
  const [x, , y] = props.a;
  return x + y;
}
```
