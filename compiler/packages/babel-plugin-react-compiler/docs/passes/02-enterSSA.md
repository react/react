# enterSSA

## File
`src/SSA/EnterSSA.ts`

## Purpose
Converts the HIR from a non-SSA form (where variables can be reassigned) into Static Single Assignment (SSA) form, where each variable is defined exactly once and phi nodes are inserted at control flow join points to merge values from different paths.

## Input Invariants
- The HIR must have blocks in reverse postorder (predecessors visited before successors, except for back-edges)
- Block predecessor information (`block.preds`) must be populated correctly
- The function's `context` array must be empty for the root function (outer function declarations)
- Identifiers may be reused across multiple definitions/assignments (non-SSA form)

## Output Guarantees
- Each identifier has a unique `IdentifierId` - no identifier is defined more than once
- All operand references use the SSA-renamed identifiers
- Phi nodes are inserted at join points where values from different control flow paths converge
- Function parameters are SSA-renamed
- Nested functions (FunctionExpression, ObjectMethod) are recursively converted to SSA form
- Context variables (captured from outer scopes) are handled specially and not redefined

## Algorithm
The pass uses the Braun et al. algorithm ("Simple and Efficient Construction of Static Single Assignment Form") with adaptations for handling loops and nested functions.

### Key Steps:
1. **Block Traversal**: Iterate through blocks in order (assumed reverse postorder from previous passes)
2. **Definition Tracking**: Maintain a per-block `defs` map from original identifiers to their SSA-renamed versions
3. **Renaming**:
   - When a value is **defined** (lvalue), create a new SSA identifier with fresh `IdentifierId`
   - When a value is **used** (operand), look up the current SSA identifier via `getIdAt`
4. **Phi Node Insertion**: When looking up an identifier at a block with multiple predecessors:
   - If all predecessors have been visited, create a phi node collecting values from each predecessor
   - If some predecessors are unvisited (back-edge/loop), create an "incomplete phi" that will be fixed later
5. **Incomplete Phi Resolution**: When all predecessors of a block are finally visited, fix any incomplete phi nodes by populating their operands
6. **Nested Function Handling**: Recursively apply SSA transformation to nested functions, temporarily adding a fake predecessor edge to enable identifier lookup from the enclosing scope

### Phi Node Placement Logic (`getIdAt`):
- If the identifier is defined locally in the current block, return it
- If at entry block with no predecessors and not found, mark as unknown (global)
- If some predecessors are unvisited (loop), create incomplete phi
- If exactly one predecessor, recursively look up in that predecessor
- If multiple predecessors, create phi node with operands from all predecessors

## Key Data Structures
- **SSABuilder**: Main class managing the transformation
  - `#states: Map<BasicBlock, State>` - Per-block state (defs map and incomplete phis)
  - `unsealedPreds: Map<BasicBlock, number>` - Count of unvisited predecessors per block
  - `#unknown: Set<Identifier>` - Identifiers assumed to be globals
  - `#context: Set<Identifier>` - Context variables that should not be redefined
- **State**: Per-block state containing:
  - `defs: Map<Identifier, Identifier>` - Maps original identifiers to SSA-renamed versions
  - `incompletePhis: Array<IncompletePhi>` - Phi nodes waiting for predecessor values
- **IncompletePhi**: Tracks a phi node created before all predecessors were visited
  - `oldPlace: Place` - Original place being phi'd
  - `newPlace: Place` - SSA-renamed phi result place
- **Phi**: The actual phi node in the HIR
  - `place: Place` - The result of the phi
  - `operands: Map<BlockId, Place>` - Maps predecessor block to the place providing the value

## Edge Cases
- **Loops (back-edges)**: When a variable is used in a loop header before the loop body assigns it, an incomplete phi is created and later fixed when the loop body block is visited
- **Globals**: If an identifier is used but never defined (reaching the entry block without a definition), it's assumed to be a global and not renamed
- **Context variables**: Variables captured from an outer function scope are tracked specially and not redefined when reassigned
- **Nested functions**: Function expressions and object methods are processed recursively with a temporary predecessor edge linking them to the enclosing block

## TODOs
- `[hoisting] EnterSSA: Expected identifier to be defined before being used` - Handles cases where hoisting causes an identifier to be used before definition (throws a Todo error for graceful bailout)

## Example

### Input (simple reassignment with control flow):
```javascript
function foo() {
  let y = 2;
  if (y > 1) {
    y = 1;
  } else {
    y = 2;
  }
  let x = y;
}
```

### Before SSA (HIR):
```
bb0 (block):
  [1] $0 = 2
  [2] $2 = StoreLocal Let y$1 = $0
  [3] $7 = LoadLocal y$1
  [4] $8 = 1
  [5] $9 = Binary $7 > $8
  [6] If ($9) then:bb2 else:bb3 fallthrough=bb1

bb2 (block):
  predecessor blocks: bb0
  [7] $3 = 1
  [8] $4 = StoreLocal Reassign y$1 = $3  // Same y$1 reassigned
  [9] Goto bb1

bb3 (block):
  predecessor blocks: bb0
  [10] $5 = 2
  [11] $6 = StoreLocal Reassign y$1 = $5  // Same y$1 reassigned
  [12] Goto bb1

bb1 (block):
  predecessor blocks: bb2 bb3
  [13] $10 = LoadLocal y$1                // Which y$1?
  [14] $12 = StoreLocal Let x$11 = $10
```

### After SSA:
```
bb0 (block):
  [1] $15 = 2
  [2] $17 = StoreLocal Let y$16 = $15    // y$16: initial definition
  [3] $18 = LoadLocal y$16
  [4] $19 = 1
  [5] $20 = Binary $18 > $19
  [6] If ($20) then:bb2 else:bb3 fallthrough=bb1

bb2 (block):
  predecessor blocks: bb0
  [7] $21 = 1
  [8] $23 = StoreLocal Reassign y$22 = $21  // y$22: new SSA name
  [9] Goto bb1

bb3 (block):
  predecessor blocks: bb0
  [10] $24 = 2
  [11] $26 = StoreLocal Reassign y$25 = $24  // y$25: new SSA name
  [12] Goto bb1

bb1 (block):
  predecessor blocks: bb2 bb3
  y$27: phi(bb2: y$22, bb3: y$25)           // PHI NODE: merges y$22 and y$25
  [13] $28 = LoadLocal y$27                  // Uses phi result
  [14] $30 = StoreLocal Let x$29 = $28
```

### Loop Example (while loop with back-edge):
```javascript
function foo() {
  let x = 1;
  while (x < 10) {
    x = x + 1;
  }
  return x;
}
```

### After SSA:
```
bb0 (block):
  [1] $13 = 1
  [2] $15 = StoreLocal Let x$14 = $13    // x$14: initial definition
  [3] While test=bb1 loop=bb3 fallthrough=bb2

bb1 (loop):
  predecessor blocks: bb0 bb3
  x$16: phi(bb0: x$14, bb3: x$23)        // PHI merges initial and loop-updated values
  [4] $17 = LoadLocal x$16
  [5] $18 = 10
  [6] $19 = Binary $17 < $18
  [7] Branch ($19) then:bb3 else:bb2

bb3 (block):
  predecessor blocks: bb1
  [8] $20 = LoadLocal x$16               // Uses phi result
  [9] $21 = 1
  [10] $22 = Binary $20 + $21
  [11] $24 = StoreLocal Reassign x$23 = $22  // x$23: new SSA name in loop body
  [12] Goto(Continue) bb1

bb2 (block):
  predecessor blocks: bb1
  [13] $25 = LoadLocal x$16              // Uses phi result
  [14] Return Explicit $25
```

The phi node at `bb1` (the loop header) is initially created as an "incomplete phi" when first visited because `bb3` (the loop body) hasn't been visited yet. Once `bb3` is processed and its terminal is handled, the incomplete phi is fixed by calling `fixIncompletePhis` to populate the operand from `bb3`.
