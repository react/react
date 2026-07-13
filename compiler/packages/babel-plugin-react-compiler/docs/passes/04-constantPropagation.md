# constantPropagation

## File
`src/Optimization/ConstantPropagation.ts`

## Purpose
Applies Sparse Conditional Constant Propagation (SCCP) to fold compile-time evaluable expressions to constant values, propagate those constants through the program, and eliminate unreachable branches when conditionals have known constant values.

## Input Invariants
- HIR must be in SSA form (runs after `enterSSA`)
- Redundant phi nodes should be eliminated (runs after `eliminateRedundantPhi`)
- Consistent identifiers must be ensured (`assertConsistentIdentifiers`)
- Terminal successors must exist (`assertTerminalSuccessorsExist`)

## Output Guarantees
- Instructions with compile-time evaluable operands are replaced with `Primitive` constants
- `ComputedLoad`/`ComputedStore` with constant string/number properties are converted to `PropertyLoad`/`PropertyStore`
- `LoadLocal` and `StoreLocal` propagate known constant values
- `IfTerminal` with constant boolean test values are replaced with `goto` terminals
- Unreachable blocks are removed and the CFG is minimized
- Phi nodes with unreachable predecessor operands are pruned
- Nested functions (`FunctionExpression`, `ObjectMethod`) are recursively processed

## Algorithm
The pass uses Sparse Conditional Constant Propagation (SCCP) with fixpoint iteration:

1. **Data Structure**: A `Constants` map (`Map<IdentifierId, Constant>`) tracks known constant values (either `Primitive` or `LoadGlobal`)

2. **Single Pass per Iteration**: Visits all blocks in order:
   - Evaluates phi nodes - if all operands have the same constant value, the phi result is constant
   - Evaluates instructions - replaces evaluable expressions with constants
   - Evaluates terminals - if an `IfTerminal` test is a constant, replaces it with a `goto`

3. **Fixpoint Loop**: If any terminals changed (branch elimination):
   - Recomputes block ordering (`reversePostorderBlocks`)
   - Removes unreachable code (`removeUnreachableForUpdates`, `removeDeadDoWhileStatements`, `removeUnnecessaryTryCatch`)
   - Renumbers instructions (`markInstructionIds`)
   - Updates predecessors (`markPredecessors`)
   - Prunes phi operands from unreachable predecessors
   - Eliminates newly-redundant phis (`eliminateRedundantPhi`)
   - Merges consecutive blocks (`mergeConsecutiveBlocks`)
   - Repeats until no more changes

4. **Instruction Evaluation**: Handles various instruction types:
   - **Primitives/LoadGlobal**: Directly constant
   - **BinaryExpression**: Folds arithmetic (`+`, `-`, `*`, `/`, `%`, `**`), bitwise (`|`, `&`, `^`, `<<`, `>>`, `>>>`), and comparison (`<`, `<=`, `>`, `>=`, `==`, `===`, `!=`, `!==`) operators
   - **UnaryExpression**: Folds `!` (boolean negation) and `-` (numeric negation)
   - **PostfixUpdate/PrefixUpdate**: Folds `++`/`--` on constant numbers
   - **PropertyLoad**: Folds `.length` on constant strings
   - **TemplateLiteral**: Folds template strings with constant interpolations
   - **ComputedLoad/ComputedStore**: Converts to property access when property is constant string/number

## Key Data Structures
- `Constant = Primitive | LoadGlobal` - The lattice values (no top/bottom, absence means unknown)
- `Constants = Map<IdentifierId, Constant>` - Maps identifier IDs to their known constant values
- Uses HIR types: `Instruction`, `Phi`, `Place`, `Primitive`, `LoadGlobal`, `InstructionValue`

## Edge Cases
- **Last instruction of sequence blocks**: Skipped to preserve evaluation order
- **Phi nodes with back-edges**: Single-pass analysis means loop back-edges won't have constant values propagated
- **Template literals with Symbol**: Not folded (would throw at runtime)
- **Template literals with objects/arrays**: Not folded (custom toString behavior)
- **Division results**: Computed at compile time (may produce `NaN`, `Infinity`, etc.)
- **LoadGlobal in phis**: Only propagated if all operands reference the same global name
- **Nested functions**: Constants from outer scope are propagated into nested function expressions

## TODOs
- `// TODO: handle more cases` - The default case in `evaluateInstruction` has room for additional instruction types

## Example

**Input:**
```javascript
function Component() {
  let a = 1;

  let b;
  if (a === 1) {
    b = true;
  } else {
    b = false;
  }

  let c;
  if (b) {
    c = 'hello';
  } else {
    c = null;
  }

  return c;
}
```

**After ConstantPropagation:**
- `a === 1` evaluates to `true`
- The `if (a === 1)` branch is eliminated, only consequent remains
- `b` is known to be `true`
- `if (b)` branch is eliminated, only consequent remains
- `c` is known to be `'hello'`
- All intermediate blocks are merged

**Output:**
```javascript
function Component() {
  return "hello";
}
```

The pass performs iterative simplification: first iteration determines `a === 1` is `true` and eliminates that branch. The CFG is updated, phi for `b` is pruned to single operand making `b = true`. Second iteration uses `b = true` to eliminate the next branch. This continues until no more branches can be eliminated.
