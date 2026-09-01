# buildReactiveScopeTerminalsHIR

## File
`src/HIR/BuildReactiveScopeTerminalsHIR.ts`

## Purpose
This pass transforms the HIR by inserting `ReactiveScopeTerminal` nodes to explicitly demarcate the boundaries of reactive scopes within the control flow graph. It converts the implicit scope ranges (stored on identifiers as `identifier.scope.range`) into explicit control flow structure by:

1. Inserting a `scope` terminal at the **start** of each reactive scope
2. Inserting a `goto` terminal at the **end** of each reactive scope
3. Creating fallthrough blocks to properly connect the scopes to the rest of the CFG

This transformation makes scope boundaries first-class elements in the CFG, which is essential for later passes that generate the memoization code (the `if ($[n] !== dep)` checks).

## Input Invariants
- **Properly nested scopes and blocks**: The pass assumes `assertValidBlockNesting` has passed, meaning all program blocks and reactive scopes form a proper tree hierarchy
- **Aligned scope ranges**: Reactive scope ranges have been correctly aligned and merged by previous passes
- **Valid instruction IDs**: All instructions have sequential IDs that define the scope boundaries
- **Scopes attached to identifiers**: Reactive scopes are found by traversing all `Place` operands and collecting unique non-empty scopes

## Output Guarantees
- **Explicit scope terminals**: Each reactive scope is represented in the CFG as a `ReactiveScopeTerminal` with:
  - `block` - The BlockId containing the scope's instructions
  - `fallthrough` - The BlockId that executes after the scope
- **Proper block structure**: Original blocks are split at scope boundaries
- **Restored HIR invariants**: The pass restores RPO ordering, predecessor sets, instruction IDs, and scope/identifier ranges
- **Updated phi nodes**: Phi operands are repointed when their source blocks are split

## Algorithm

### Step 1: Collect Scope Rewrites
```
for each reactive scope (in range pre-order):
  push StartScope rewrite at scope.range.start
  push EndScope rewrite at scope.range.end
```
The `recursivelyTraverseItems` helper traverses scopes in pre-order (outer scopes before inner scopes).

### Step 2: Apply Rewrites by Splitting Blocks
```
reverse queuedRewrites (to pop in ascending instruction order)
for each block:
  for each instruction (or terminal):
    while there are rewrites <= current instruction ID:
      split block at current index
      insert scope terminal (for start) or goto terminal (for end)
  emit final block segment with original terminal
```

### Step 3: Repoint Phi Nodes
When a block is split, its final segment gets a new BlockId. Phi operands that referenced the original block are updated to reference the new final block.

### Step 4: Restore HIR Invariants
- Recompute RPO (reverse post-order) block traversal
- Recalculate predecessor sets
- Renumber instruction IDs
- Fix scope and identifier ranges to match new instruction IDs

## Key Data Structures

### TerminalRewriteInfo
```typescript
type TerminalRewriteInfo =
  | {
      kind: 'StartScope';
      blockId: BlockId;        // New block for scope content
      fallthroughId: BlockId;  // Block after scope ends
      instrId: InstructionId;  // Where to insert
      scope: ReactiveScope;    // The scope being created
    }
  | {
      kind: 'EndScope';
      instrId: InstructionId;  // Where to insert
      fallthroughId: BlockId;  // Same as corresponding StartScope
    };
```

### RewriteContext
```typescript
type RewriteContext = {
  source: BasicBlock;        // Original block being split
  instrSliceIdx: number;     // Current slice start index
  nextPreds: Set<BlockId>;   // Predecessors for next emitted block
  nextBlockId: BlockId;      // BlockId for next emitted block
  rewrites: Array<BasicBlock>; // Accumulated split blocks
};
```

### ScopeTraversalContext
```typescript
type ScopeTraversalContext = {
  fallthroughs: Map<ScopeId, BlockId>; // Cache: scope -> its fallthrough block
  rewrites: Array<TerminalRewriteInfo>;
  env: Environment;
};
```

## Edge Cases

### Multiple Rewrites at Same Instruction ID
The while loop in Step 2 handles multiple scope start/ends at the same instruction ID.

### Nested Scopes
The pre-order traversal ensures outer scopes are processed before inner scopes, creating proper nesting in the CFG.

### Empty Blocks After Split
When a scope boundary falls at the start of a block, the split may create a block with no instructions (only a terminal).

### Control Flow Within Scopes
The pass preserves existing control flow (if/else, loops) within scopes; it only adds scope entry/exit points.

### Early Returns
When a return occurs within a scope, the scope terminal still has a fallthrough block, but that block may contain `Unreachable` terminal.

## TODOs
Line 283-284:
```typescript
// TODO make consistent instruction IDs instead of reusing
```

## Example

### Fixture: `reactive-scopes-if.js`

**Before BuildReactiveScopeTerminalsHIR:**
```
bb0 (block):
  [1] $29_@0[1:22] = Array []           // x with scope @0 range [1:22]
  [2] StoreLocal x$30_@0 = $29_@0
  [3] $32 = LoadLocal a$26
  [4] If ($32) then:bb2 else:bb3 fallthrough=bb1
bb2:
  [5] $33_@1[5:11] = Array []           // y with scope @1 range [5:11]
  ...
```

**After BuildReactiveScopeTerminalsHIR:**
```
bb0 (block):
  [1] Scope @0 [1:28] block=bb9 fallthrough=bb10   // <-- scope terminal inserted
bb9:
  [2] $29_@0 = Array []
  [3] StoreLocal x$30_@0 = $29_@0
  [4] $32 = LoadLocal a$26
  [5] If ($32) then:bb2 else:bb3 fallthrough=bb1
bb2:
  [6] Scope @1 [6:14] block=bb11 fallthrough=bb12  // <-- nested scope terminal
bb11:
  [7] $33_@1 = Array []
  ...
  [13] Goto bb12                                    // <-- scope end goto
bb12:
  ...
bb1:
  [27] Goto bb10                                    // <-- scope @0 end goto
bb10:
  [28] $50 = LoadLocal x$30_@0
  [29] Return $50
```

The key transformation is that scope boundaries become explicit control flow: a `Scope` terminal enters the scope content block, and a `Goto` terminal exits to the fallthrough block. This structure is later used to generate the memoization checks.
