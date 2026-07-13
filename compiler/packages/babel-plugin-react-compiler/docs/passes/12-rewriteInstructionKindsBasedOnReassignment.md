# rewriteInstructionKindsBasedOnReassignment

## File
`src/SSA/RewriteInstructionKindsBasedOnReassignment.ts`

## Purpose
Rewrites the `InstructionKind` of variable declaration and assignment instructions to correctly reflect whether variables should be declared as `const` or `let` in the final output. It determines this based on whether a variable is subsequently reassigned after its initial declaration.

The key insight is that this pass runs **after dead code elimination (DCE)**, so a variable that was originally declared with `let` in the source (because it was reassigned) may be converted to `const` if the reassignment was removed by DCE. However, variables originally declared as `const` cannot become `let`.

## Input Invariants
- SSA form: Each identifier has a unique `IdentifierId` and `DeclarationId`
- Dead code elimination has run: Unused assignments have been removed
- Mutation/aliasing inference complete: Runs after `InferMutationAliasingRanges` and `InferReactivePlaces` in the main pipeline
- All instruction kinds are initially set (typically `Let` for variables that may be reassigned)

## Output Guarantees
- **First declaration gets `Const` or `Let`**: The first `StoreLocal` for a named variable is marked as:
  - `InstructionKind.Const` if the variable is never reassigned after
  - `InstructionKind.Let` if the variable has subsequent reassignments
- **Reassignments marked as `Reassign`**: Any subsequent `StoreLocal` to the same `DeclarationId` is marked as `InstructionKind.Reassign`
- **Destructure consistency**: All places in a destructuring pattern must have consistent kinds (all Const or all Reassign)
- **Update operations trigger Let**: `PrefixUpdate` and `PostfixUpdate` operations (like `++x` or `x--`) mark the original declaration as `Let`

## Algorithm

1. **Initialize declarations map**: Create a `Map<DeclarationId, LValue | LValuePattern>` to track declared variables.

2. **Seed with parameters and context**: Add all named function parameters and captured context variables to the map with kind `Let` (since they're already "declared" outside the function body).

3. **Process blocks in order**: Iterate through all blocks and instructions:

   - **DeclareLocal**: Record the declaration in the map (invariant: must not already exist)

   - **StoreLocal**:
     - If not in map: This is the first store, add to map with `kind = Const`
     - If already in map: This is a reassignment. Update original declaration to `Let`, set current instruction to `Reassign`

   - **Destructure**:
     - For each operand in the pattern, check if it's already declared
     - All operands must be consistent (all new declarations OR all reassignments)
     - Set pattern kind to `Const` for new declarations, `Reassign` for existing ones

   - **PrefixUpdate / PostfixUpdate**: Look up the declaration and mark it as `Let` (these always imply reassignment)

## Key Data Structures

```typescript
// Main tracking structure
const declarations = new Map<DeclarationId, LValue | LValuePattern>();

// InstructionKind enum (from HIR.ts)
enum InstructionKind {
  Const = 'Const',      // const declaration
  Let = 'Let',          // let declaration
  Reassign = 'Reassign', // reassignment to existing binding
  Catch = 'Catch',      // catch clause binding
  HoistedLet = 'HoistedLet',     // hoisted let
  HoistedConst = 'HoistedConst', // hoisted const
  HoistedFunction = 'HoistedFunction', // hoisted function
  Function = 'Function', // function declaration
}
```

## Edge Cases

### DCE Removes Reassignment
A `let x = 0; x = 1;` where `x = 1` is unused becomes `const x = 0;` after DCE.

### Destructuring with Mixed Operands
The invariant checks ensure all operands in a destructure pattern are either all new declarations or all reassignments. Mixed cases cause a compiler error.

### Value Blocks with DCE
There's a TODO for handling reassignment in value blocks where the original declaration was removed by DCE.

### Parameters and Context Variables
These are pre-seeded as `Let` in the declarations map since they're conceptually "declared" at function entry.

### Update Expressions
`++x` and `x--` always mark the variable as `Let`, even if used inline.

## TODOs
```typescript
CompilerError.invariant(block.kind !== 'value', {
  reason: `TODO: Handle reassignment in a value block where the original
           declaration was removed by dead code elimination (DCE)`,
  ...
});
```

This indicates an edge case where a destructuring reassignment occurs in a value block but the original declaration was eliminated by DCE. This is currently an invariant violation rather than handled gracefully.

## Example

### Fixture: `reassignment.js`

**Input Source:**
```javascript
function Component(props) {
  let x = [];
  x.push(props.p0);
  let y = x;

  x = [];
  let _ = <Component x={x} />;

  y.push(props.p1);

  return <Component x={x} y={y} />;
}
```

**Before Pass (InferReactivePlaces output):**
```
[2] StoreLocal Let x$32 = $31      // x is initially marked Let
[9] StoreLocal Let y$40 = $39      // y is initially marked Let
[11] StoreLocal Reassign x$43 = $42  // reassignment already marked
```

**After Pass:**
```
[2] StoreLocal Let x$32 = $31      // x stays Let (has reassignment at line 11)
[9] StoreLocal Const y$40 = $39    // y becomes Const (never reassigned)
[11] StoreLocal Reassign x$43 = $42  // stays Reassign
```

**Final Generated Code:**
```javascript
function Component(props) {
  const $ = _c(4);
  let t0;
  if ($[0] !== props.p0 || $[1] !== props.p1) {
    let x = [];              // let because reassigned
    x.push(props.p0);
    const y = x;             // const because never reassigned
    // ... x = t1; (reassignment)
    y.push(props.p1);
    t0 = <Component x={x} y={y} />;
    // ...
  }
  return t0;
}
```

The pass correctly identified that `x` needs `let` (since it's reassigned on line 6 of the source) while `y` can use `const` (it's never reassigned after initialization).

## Where This Pass is Called

1. **Main Pipeline** (`src/Entrypoint/Pipeline.ts:322`): Called after `InferReactivePlaces` and before `InferReactiveScopeVariables`.

2. **AnalyseFunctions** (`src/Inference/AnalyseFunctions.ts:58`): Called when lowering inner function expressions as part of the function analysis phase.
