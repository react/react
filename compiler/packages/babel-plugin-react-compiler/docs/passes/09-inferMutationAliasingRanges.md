# inferMutationAliasingRanges

## File
`src/Inference/InferMutationAliasingRanges.ts`

## Purpose
This pass builds an abstract model of the heap and interprets the effects of the given function to determine: (1) the mutable ranges of all identifiers, (2) the externally-visible effects of the function (mutations of params/context-vars, aliasing relationships), and (3) the legacy `Effect` annotation for each Place.

## Input Invariants
- InferMutationAliasingEffects must have already run, populating `instr.effects` on each instruction with aliasing/mutation effects
- SSA form must be established (identifiers are in SSA)
- Type inference has been run (InferTypes)
- Functions have been analyzed (AnalyseFunctions)
- Dead code elimination has been performed

## Output Guarantees
- Every identifier has a populated `mutableRange` (start:end instruction IDs)
- Every Place has a legacy `Effect` annotation (Read, Capture, Store, Freeze, etc.)
- The function's `aliasingEffects` array is populated with externally-visible effects (mutations of params/context-vars, aliasing between params/context-vars/return)
- Validation errors are collected for invalid effects like `MutateFrozen` or `MutateGlobal`

## Algorithm
The pass operates in three main phases:

**Part 1: Build Data Flow Graph and Infer Mutable Ranges**
1. Creates an `AliasingState` which maintains a `Node` for each identifier
2. Iterates through all blocks and instructions, processing effects in program order
3. For each effect:
   - `Create`/`CreateFunction`: Creates a new node in the graph
   - `CreateFrom`/`Assign`/`Alias`: Adds alias edges between nodes (with ordering index)
   - `MaybeAlias`: Adds conditional alias edges
   - `Capture`: Adds capture edges (for transitive mutations)
   - `Mutate*`: Queues mutations for later processing
   - `Render`: Queues render effects for later processing
4. Phi node operands are connected once their predecessor blocks have been visited
5. After the graph is built, mutations are processed:
   - Mutations propagate both forward (via edges) and backward (via aliases/captures)
   - Each mutation extends the `mutableRange.end` of affected identifiers
   - Transitive mutations also traverse capture edges backward
   - `MaybeAlias` edges downgrade mutations to `Conditional`
6. Render effects are processed to mark values as rendered

**Part 2: Populate Legacy Per-Place Effects**
- Sets legacy effects on lvalues and operands based on instruction effects and mutable ranges
- Fixes up mutable range start values for identifiers that are mutated after creation

**Part 3: Infer Externally-Visible Function Effects**
- Creates a `Create` effect for the return value
- Simulates transitive mutations of each param/context-var/return to detect capture relationships
- Produces `Alias`/`Capture` effects showing data flow between params/context-vars/return

## Key Data Structures

### `AliasingState`
The main state class maintaining the data flow graph:
- `nodes: Map<Identifier, Node>` - Maps identifiers to their graph nodes

### `Node`
Represents an identifier in the data flow graph:
```typescript
type Node = {
  id: Identifier;
  createdFrom: Map<Identifier, number>;   // CreateFrom edges (source -> index)
  captures: Map<Identifier, number>;       // Capture edges (source -> index)
  aliases: Map<Identifier, number>;        // Alias/Assign edges (source -> index)
  maybeAliases: Map<Identifier, number>;   // MaybeAlias edges (source -> index)
  edges: Array<{index, node, kind}>;       // Forward edges to other nodes
  transitive: {kind: MutationKind; loc} | null;  // Transitive mutation info
  local: {kind: MutationKind; loc} | null;       // Local mutation info
  lastMutated: number;                     // Index of last mutation affecting this node
  mutationReason: MutationReason | null;   // Reason for mutation
  value: {kind: 'Object'} | {kind: 'Phi'} | {kind: 'Function'; function: HIRFunction};
  render: Place | null;                    // Render context if used in JSX
};
```

### `MutationKind`
Enum describing mutation certainty:
```typescript
enum MutationKind {
  None = 0,
  Conditional = 1,  // May mutate (e.g., via MaybeAlias or MutateConditionally)
  Definite = 2,     // Definitely mutates
}
```

## Edge Cases

### Phi Nodes
- Phi nodes are created as special `{kind: 'Phi'}` nodes
- Phi operands from predecessor blocks are processed with pending edges until the predecessor is visited
- When traversing "forwards" through edges and encountering a phi, backward traversal is stopped (prevents mutation from one phi input affecting other inputs)

### Transitive vs Local Mutations
- Local mutations (`Mutate`) only affect alias/assign edges backward
- Transitive mutations (`MutateTransitive`) also affect capture edges backward
- Both affect all forward edges

### MaybeAlias
- Mutations through MaybeAlias edges are downgraded to `Conditional`
- This prevents false positive errors when we cannot be certain about aliasing

### Function Values
- Functions are tracked specially as `{kind: 'Function'}` nodes
- When a function is mutated (transitively), errors from the function body are propagated
- This handles cases where mutating a captured value in a function affects render safety

### Render Effect Propagation
- Render effects traverse backward through alias/capture/createFrom edges
- Functions that have not been mutated are skipped during render traversal (except for JSX-returning functions)
- Ref types (`isUseRefType`) stop render traversal

## TODOs
1. Assign effects should have an invariant that the node is not initialized yet. Currently `InferFunctionExpressionAliasingEffectSignatures` infers Assign effects that should be Alias, causing reinitialization.

2. Phi place effects are not properly set today.

3. Phi mutable range start calculation is imprecise - currently just sets it to the instruction before the block rather than computing the exact start.

## Example

Consider the following code:
```javascript
function foo() {
  let a = {};   // Create a (instruction 1)
  let b = {};   // Create b (instruction 3)
  a = b;        // Assign a <- b (instruction 8)
  mutate(a, b); // MutateTransitiveConditionally a, b (instruction 16)
  return a;
}
```

The pass builds a graph:
1. Creates node for `{}` at instruction 1 (initially assigned to `a`)
2. Creates node for `{}` at instruction 3 (initially assigned to `b`)
3. At instruction 8, creates alias edge: `b -> a` with index 8
4. At instruction 16, mutations are queued for `a` and `b`

When processing the mutation of `a` at instruction 16:
- Extends `a`'s mutableRange.end to 17
- Traverses backward through alias edge to `b`, extends `b`'s mutableRange.end to 17
- Since `a = b`, both objects must be considered mutable until instruction 17

The output shows identifiers with range annotations like `$25[3:17]` meaning:
- `$25` is the identifier
- `3` is the instruction where it was created
- `17` is the instruction after which it is no longer mutated

For aliased values, the ranges are unified - all values that could be affected by a mutation have their ranges extended to include that mutation point.
