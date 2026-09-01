# inferMutationAliasingEffects

## File
`src/Inference/InferMutationAliasingEffects.ts`

## Purpose
Infers the mutation and aliasing effects for all instructions and terminals in the HIR, making the effects of built-in instructions/functions as well as user-defined functions explicit. These effects form the basis for subsequent analysis to determine the mutable range of each value in the program and for validation against invalid code patterns like mutating frozen values.

## Input Invariants
- HIR must be in SSA form (run after SSA pass)
- Types must be inferred (run after InferTypes pass)
- Functions must be analyzed (run after AnalyseFunctions pass) - this provides `aliasingEffects` on FunctionExpressions
- Each instruction must have an lvalue (destination place)

## Output Guarantees
- Every instruction has an `effects` array (or null if no effects) containing `AliasingEffect` objects
- Terminals that affect data flow (return, try/catch) have their `effects` populated
- Each instruction's lvalue is guaranteed to be defined in the inference state after visiting
- Effects describe: creation of values, data flow (Assign, Alias, Capture), mutations (Mutate, MutateTransitive), freezing, and errors (MutateFrozen, MutateGlobal, Impure)

## Algorithm
The pass uses abstract interpretation with the following key phases:

1. **Initialization**:
   - Create initial `InferenceState` mapping identifiers to abstract values
   - Initialize context variables as `ValueKind.Context`
   - Initialize parameters as `ValueKind.Frozen` (for top-level components/hooks) or `ValueKind.Mutable` (for function expressions)

2. **Two-Phase Effect Processing**:
   - **Phase 1 - Signature Computation**: For each instruction, compute a "candidate signature" based purely on instruction semantics and types (cached per instruction via `computeSignatureForInstruction`)
   - **Phase 2 - Effect Application**: Apply the signature to the current abstract state via `applySignature`, which refines effects based on the actual runtime kinds of values

3. **Fixed-Point Iteration**:
   - Process blocks in a worklist, queuing successors after each block
   - Merge states at control flow join points using lattice operations
   - Iterate until no changes occur (max 100 iterations as safety limit)
   - Phi nodes are handled by unioning the abstract values from all predecessors

4. **Effect Refinement** (in `applyEffect`):
   - `MutateConditionally` effects are dropped if value is not mutable
   - `Capture` effects are downgraded to `ImmutableCapture` if source is frozen
   - `Mutate` on frozen values becomes `MutateFrozen` error
   - `Assign` from primitives/globals creates new values rather than aliasing

## Key Data Structures

### InferenceState
Maintains two maps:
- `#values: Map<InstructionValue, AbstractValue>` - Maps allocation sites to their abstract kind
- `#variables: Map<IdentifierId, Set<InstructionValue>>` - Maps identifiers to the set of values they may point to (set to handle phi joins)

### AbstractValue
```typescript
type AbstractValue = {
  kind: ValueKind;
  reason: ReadonlySet<ValueReason>;
};
```

### ValueKind (lattice)
```
MaybeFrozen    <- top (unknown if frozen or mutable)
    |
  Frozen       <- immutable, cannot be mutated
  Mutable      <- can be mutated locally
  Context      <- mutable box (context variables)
    |
  Global       <- global value
  Primitive    <- copy-on-write semantics
```

The `mergeValueKinds` function implements the lattice join:
- `Frozen | Mutable -> MaybeFrozen`
- `Context | Mutable -> Context`
- `Context | Frozen -> MaybeFrozen`

### AliasingEffect Types
Key effect kinds handled:
- **Create**: Creates a new value at a place
- **Assign**: Direct assignment (pointer copy)
- **Alias**: Mutation of destination implies mutation of source
- **Capture**: Information flow (MutateTransitive propagates through)
- **MaybeAlias**: Possible aliasing for unknown function returns
- **Mutate/MutateTransitive**: Direct/transitive mutation
- **MutateConditionally/MutateTransitiveConditionally**: Conditional versions
- **Freeze**: Marks value as immutable
- **Apply**: Function call with complex data flow

## Edge Cases

1. **Spread Destructuring from Props**: The `findNonMutatedDestructureSpreads` pre-pass identifies spread patterns from frozen values that are never mutated, allowing them to be treated as frozen.

2. **Hoisted Context Declarations**: Special handling for variables declared with hoisting (`HoistedConst`, `HoistedFunction`, `HoistedLet`) to detect access before declaration.

3. **Try-Catch Aliasing**: When a `maybe-throw` terminal is reached, call return values are aliased into the catch binding since exceptions can throw return values.

4. **Function Expressions**: Functions are considered mutable only if they have mutable captures or tracked side effects (MutateFrozen, MutateGlobal, Impure).

5. **Iterator Mutation**: Non-builtin iterators may alias their collection and mutation of the iterator is conditional.

6. **Array.push and Similar**: Uses legacy signature system with `Store` effect on receiver and `Capture` of arguments.

## TODOs
- `// TODO: using InstructionValue as a bit of a hack, but it's pragmatic` - context variable initialization
- `// TODO: call applyEffect() instead` - try-catch aliasing
- `// TODO: make sure we're also validating against global mutations somewhere` - global mutation validation for effects/event handlers
- `// TODO; include "render" here?` - whether to track Render effects in function hasTrackedSideEffects
- `// TODO: consider using persistent data structures to make clone cheaper` - performance optimization for state cloning
- `// TODO check this` and `// TODO: what kind here???` - DeclareLocal value kinds

## Example

For the code:
```javascript
const arr = [];
arr.push({});
arr.push(x, y);
```

After `InferMutationAliasingEffects`, the effects are:

```
[10] $39 = Array []
    Create $39 = mutable           // Array literal creates mutable value

[11] $41 = StoreLocal arr$40 = $39
    Assign arr$40 = $39            // arr points to the array value
    Assign $41 = $39

[15] $45 = MethodCall $42.push($44)
    Apply $45 = $42.$43($44)       // Records the call
    Mutate $42                      // push mutates the array
    Capture $42 <- $44             // {} is captured into array
    Create $45 = primitive         // push returns number (length)

[20] $50 = MethodCall $46.push($48, $49)
    Apply $50 = $46.$47($48, $49)
    Mutate $46                      // push mutates the array
    Capture $46 <- $48             // x captured into array
    Capture $46 <- $49             // y captured into array
    Create $50 = primitive
```

The key insight is that `Mutate` effects extend the mutable range of the array, and `Capture` effects record data flow so that if the array is later frozen (e.g., returned from a component), the captured values are also considered frozen for validation purposes.
