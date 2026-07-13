# eliminateRedundantPhi

## File
`src/SSA/EliminateRedundantPhi.ts`

## Purpose
Eliminates phi nodes whose operands are trivially the same, replacing all usages of the phi's output identifier with the single source identifier. This simplifies the HIR by removing unnecessary join points that do not actually merge distinct values.

## Input Invariants
- The function must be in SSA form (i.e., `enterSSA` has already run)
- Blocks are in reverse postorder (guaranteed by the HIR structure)
- Phi nodes exist at the start of blocks where control flow merges

## Output Guarantees
- All redundant phi nodes are removed from the HIR
- All references to eliminated phi identifiers are rewritten to the source identifier
- Non-redundant phi nodes (those merging two or more distinct values) are preserved
- Nested function expressions (FunctionExpression, ObjectMethod) also have their redundant phis eliminated and contexts rewritten

## Algorithm
A phi node is considered redundant when:
1. **All operands are the same identifier**: e.g., `x2 = phi(x1, x1, x1)` - the phi is replaced with `x1`
2. **All operands are either the same identifier OR the phi's output**: e.g., `x2 = phi(x1, x2, x1, x2)` - this handles loop back-edges where the phi references itself

The algorithm works as follows:
1. Visit blocks in reverse postorder, building a rewrite table (`Map<Identifier, Identifier>`)
2. For each phi node in a block:
   - First rewrite operands using any existing rewrites (to handle cascading eliminations)
   - Check if all operands (excluding self-references) point to the same identifier
   - If so, add a mapping from the phi's output to that identifier and delete the phi
3. After processing phis, rewrite all instruction lvalues, operands, and terminal operands
4. For nested functions, recursively call `eliminateRedundantPhi` with shared rewrites
5. If the CFG has back-edges (loops) and new rewrites were added, repeat the entire process

The loop termination condition `rewrites.size > size && hasBackEdge` ensures:
- Without loops: completes in a single pass (reverse postorder guarantees forward propagation)
- With loops: repeats until no new rewrites are found (fixpoint)

## Key Data Structures
- **`Phi`** (from `src/HIR/HIR.ts`): Represents a phi node with:
  - `place: Place` - the output identifier
  - `operands: Map<BlockId, Place>` - maps predecessor block IDs to source places
- **`rewrites: Map<Identifier, Identifier>`**: Maps eliminated phi outputs to their replacement identifier
- **`visited: Set<BlockId>`**: Tracks visited blocks to detect back-edges (loops)

## Edge Cases
- **Loop back-edges**: When a block has a predecessor that hasn't been visited yet (in reverse postorder), that predecessor is a back-edge. The algorithm handles self-referential phis like `x2 = phi(x1, x2)` by ignoring operands equal to the phi's output.
- **Cascading eliminations**: When one phi's output is used in another phi's operands, the algorithm rewrites operands before checking redundancy, enabling transitive elimination in a single pass (for non-loop cases).
- **Nested functions**: FunctionExpression and ObjectMethod values contain nested HIR that may have their own phis. The algorithm recursively processes these with a shared rewrite table, ensuring context captures are also rewritten.
- **Empty phi check**: The algorithm includes an invariant check that phi operands are never empty (which would be invalid HIR).

## TODOs
(None found in the source code)

## Example

Consider this fixture from `rewrite-phis-in-lambda-capture-context.js`:

```javascript
function Component() {
  const x = 4;
  const get4 = () => {
    while (bar()) {
      if (baz) { bar(); }
    }
    return () => x;
  };
  return get4;
}
```

**After SSA pass**, the inner function has redundant phis due to the loop:

```
bb2 (loop):
  predecessor blocks: bb1 bb5
  x$29: phi(bb1: x$21, bb5: x$30)  // Loop header phi
  ...
bb5 (block):
  predecessor blocks: bb6 bb4
  x$30: phi(bb6: x$29, bb4: x$29)  // Redundant: both operands are x$29
  ...
```

**After EliminateRedundantPhi**:
- `x$30 = phi(x$29, x$29)` is eliminated because both operands are `x$29`
- `x$29 = phi(x$21, x$30)` becomes `x$29 = phi(x$21, x$29)` after rewriting, which is also redundant (one operand is the phi itself, the other is `x$21`)
- Both phis are eliminated, and all uses of `x$29` and `x$30` are rewritten to `x$21`

The result: the context capture `@context[x$29]` becomes `@context[x$21]`, correctly propagating that `x` is never modified inside the loop.
