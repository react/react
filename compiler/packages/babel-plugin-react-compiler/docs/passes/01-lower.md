# lower (BuildHIR)

## File
`src/HIR/BuildHIR.ts`

## Purpose
Converts a Babel AST function node into a High-level Intermediate Representation (HIR), which represents code as a control-flow graph (CFG) with basic blocks, instructions, and terminals. This is the first major transformation pass in the React Compiler pipeline, enabling precise expression-level memoization analysis.

## Input Invariants
- Input must be a valid Babel `NodePath<t.Function>` (FunctionDeclaration, FunctionExpression, or ArrowFunctionExpression)
- The function must be a component or hook (determined by the environment)
- Babel scope analysis must be available for binding resolution
- An `Environment` instance must be provided with compiler configuration
- Optional `bindings` map for nested function lowering (recursive calls)
- Optional `capturedRefs` map for context variables captured from outer scope

## Output Guarantees
- Returns `Result<HIRFunction, CompilerError>` - either a successfully lowered function or compilation errors
- The HIR function contains:
  - A complete CFG with basic blocks (`body.blocks: Map<BlockId, BasicBlock>`)
  - Each block has an array of instructions and exactly one terminal
  - All control flow is explicit (if/else, loops, switch, logical operators, ternary)
  - Parameters are converted to `Place` or `SpreadPattern`
  - Context captures are tracked in `context` array
  - Function metadata (id, async, generator, directives)
- All identifiers get unique `IdentifierId` values
- Instructions have placeholder instruction IDs (set to 0, assigned later)
- Effects are null (populated by later inference passes)

## Algorithm
The lowering algorithm uses a recursive descent pattern with a `HIRBuilder` helper class:

1. **Initialization**: Create an `HIRBuilder` with environment and optional bindings. Process captured context variables.

2. **Parameter Processing**: For each function parameter:
   - Simple identifiers: resolve binding and create Place
   - Patterns (object/array): create temporary Place, then emit destructuring assignments
   - Rest elements: wrap in SpreadPattern
   - Unsupported: emit Todo error

3. **Body Processing**:
   - Arrow function expressions: lower body expression to temporary, emit implicit return
   - Block statements: recursively lower each statement

4. **Statement Lowering** (`lowerStatement`): Handle each statement type:
   - **Control flow**: Create separate basic blocks for branches, loops connect back to conditional blocks
   - **Variable declarations**: Create `DeclareLocal`/`DeclareContext` or `StoreLocal`/`StoreContext` instructions
   - **Expressions**: Lower to temporary and discard result
   - **Hoisting**: Detect forward references and emit `DeclareContext` for hoisted identifiers

5. **Expression Lowering** (`lowerExpression`): Convert expressions to `InstructionValue`:
   - **Identifiers**: Create `LoadLocal`, `LoadContext`, or `LoadGlobal` based on binding
   - **Literals**: Create `Primitive` values
   - **Operators**: Create `BinaryExpression`, `UnaryExpression` etc.
   - **Calls**: Distinguish `CallExpression` vs `MethodCall` (member expression callee)
   - **Control flow expressions**: Create separate value blocks for branches (ternary, logical, optional chaining)
   - **JSX**: Lower to `JsxExpression` with lowered tag, props, and children

6. **Block Management**: The builder maintains:
   - A current work-in-progress block accumulating instructions
   - Completed blocks map
   - Scope stack for break/continue resolution
   - Exception handler stack for try/catch

7. **Termination**: Add implicit void return at end if no explicit return

## Key Data Structures

### HIRBuilder (from HIRBuilder.ts)
- `#current: WipBlock` - Work-in-progress block being populated
- `#completed: Map<BlockId, BasicBlock>` - Finished blocks
- `#scopes: Array<Scope>` - Stack for break/continue target resolution (LoopScope, LabelScope, SwitchScope)
- `#exceptionHandlerStack: Array<BlockId>` - Stack of catch handlers for try/catch
- `#bindings: Bindings` - Map of variable names to their identifiers
- `#context: Map<t.Identifier, SourceLocation>` - Captured context variables
- Methods: `push()`, `reserve()`, `enter()`, `terminate()`, `terminateWithContinuation()`

### Core HIR Types
- **BasicBlock**: Contains `instructions: Array<Instruction>`, `terminal: Terminal`, `preds: Set<BlockId>`, `phis: Set<Phi>`, `kind: BlockKind`
- **Instruction**: Contains `id`, `lvalue` (Place), `value` (InstructionValue), `effects` (null initially), `loc`
- **Terminal**: Block terminator - `if`, `branch`, `goto`, `return`, `throw`, `for`, `while`, `switch`, `ternary`, `logical`, etc.
- **Place**: Reference to a value - `{kind: 'Identifier', identifier, effect, reactive, loc}`
- **InstructionValue**: The operation - `LoadLocal`, `StoreLocal`, `CallExpression`, `BinaryExpression`, `FunctionExpression`, etc.

### Block Kinds
- `block` - Regular sequential block
- `loop` - Loop header/test block
- `value` - Block that produces a value (ternary/logical branches)
- `sequence` - Sequence expression block
- `catch` - Exception handler block

## Edge Cases

1. **Hoisting**: Forward references to `let`/`const`/`function` declarations emit `DeclareContext` before the reference, enabling correct temporal dead zone handling

2. **Context Variables**: Variables captured by nested functions use `LoadContext`/`StoreContext` instead of `LoadLocal`/`StoreLocal`

3. **For-of/For-in Loops**: Synthesize iterator instructions (`GetIterator`, `IteratorNext`, `NextPropertyOf`)

4. **Optional Chaining**: Creates nested `OptionalTerminal` structures with short-circuit branches

5. **Logical Expressions**: Create branching structures where left side stores to temporary, right side only evaluated if needed

6. **Try/Catch**: Adds `MaybeThrowTerminal` after each instruction in try block, modeling potential control flow to handler

7. **JSX in fbt**: Tracks `fbtDepth` counter to handle whitespace differently in fbt/fbs tags

8. **Unsupported Syntax**: `var` declarations, `with` statements, inline `class` declarations, `eval` - emit appropriate errors

## TODOs
- `returnTypeAnnotation: null, // TODO: extract the actual return type node if present`
- `TODO(gsn): In the future, we could only pass in the context identifiers that are actually used by this function and its nested functions`
- Multiple `// TODO remove type cast` in destructuring pattern handling
- `// TODO: should JSX namespaced names be handled here as well?`

## Example
Input JavaScript:
```javascript
export default function foo(x, y) {
  if (x) {
    return foo(false, y);
  }
  return [y * 10];
}
```

Output HIR (simplified):
```
foo(<unknown> x$0, <unknown> y$1): <unknown> $12
bb0 (block):
  [1] <unknown> $6 = LoadLocal <unknown> x$0
  [2] If (<unknown> $6) then:bb2 else:bb1 fallthrough=bb1

bb2 (block):
  predecessor blocks: bb0
  [3] <unknown> $2 = LoadGlobal(module) foo
  [4] <unknown> $3 = false
  [5] <unknown> $4 = LoadLocal <unknown> y$1
  [6] <unknown> $5 = Call <unknown> $2(<unknown> $3, <unknown> $4)
  [7] Return Explicit <unknown> $5

bb1 (block):
  predecessor blocks: bb0
  [8] <unknown> $7 = LoadLocal <unknown> y$1
  [9] <unknown> $8 = 10
  [10] <unknown> $9 = Binary <unknown> $7 * <unknown> $8
  [11] <unknown> $10 = Array [<unknown> $9]
  [12] Return Explicit <unknown> $10
```

Key observations:
- The function has 3 basic blocks: entry (bb0), consequent (bb2), alternate/fallthrough (bb1)
- The if statement creates an `IfTerminal` at the end of bb0
- Each branch ends with its own `ReturnTerminal`
- All values are stored in temporaries (`$N`) or named identifiers (`x$0`, `y$1`)
- Instructions have sequential IDs within blocks
- Types and effects are `<unknown>` at this stage (populated by later passes)
