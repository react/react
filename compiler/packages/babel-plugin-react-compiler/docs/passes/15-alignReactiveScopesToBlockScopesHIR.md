# alignReactiveScopesToBlockScopesHIR

## File
`src/ReactiveScopes/AlignReactiveScopesToBlockScopesHIR.ts`

## Purpose
This is the **2nd of 4 passes** that determine how to break a function into discrete reactive scopes (independently memoizable units of code). The pass aligns reactive scope boundaries to control flow (block scope) boundaries.

The problem it solves: Prior inference passes assign reactive scopes to operands based on mutation ranges at arbitrary instruction points in the control-flow graph. However, to generate memoization blocks around instructions, scopes must be aligned to block-scope boundaries -- you cannot memoize half of a loop or half of an if-block.

**Example from the source code comments:**
```javascript
function foo(cond, a) {
                    // original scope end
                         // expanded scope end
   const x = [];    |    |
   if (cond) {      |    |
     ...            |    |
     x.push(a);     <--- original scope ended here
     ...                 |
   }                     <--- scope must extend to here
}
```

## Input Invariants
- `InferReactiveScopeVariables` has run: Each identifier has been assigned a `ReactiveScope` with a `range` (start/end instruction IDs) based on mutation analysis
- The HIR is in SSA form: Blocks have unique IDs, instructions have unique IDs, and control flow is represented with basic blocks
- Each block has a terminal with possible successors and fallthroughs
- Each scope has a mutable range `{start: InstructionId, end: InstructionId}` indicating when the scope is active

## Output Guarantees
- **Scopes end at valid block boundaries**: A reactive scope may only end at the same block scope level as it began. The scope's `range.end` is updated to the first instruction of the fallthrough block after any control flow structure that the scope overlaps
- **Scopes start at valid block boundaries**: For labeled breaks (gotos to a label), scopes that extend beyond the goto have their `range.start` extended back to include the label
- **Value blocks (ternary, logical, optional) are handled specially**: Scopes inside value blocks are extended to align with the outer block scope's instruction range

## Algorithm

The pass performs a single forward traversal over all blocks:

### 1. Tracking Active Scopes
- Maintains `activeScopes: Set<ReactiveScope>` - scopes whose range overlaps the current block
- Maintains `activeBlockFallthroughRanges: Array<{range, fallthrough}>` - stack of pending block-fallthrough ranges

### 2. Per-Block Processing
For each block:
- Prune `activeScopes` to only those that extend past the current block's start
- If this block is a fallthrough target, pop the range from the stack and extend all active scopes' start to the range start

### 3. Recording Places
For each instruction lvalue and operand:
- If the place has a scope, add it to `activeScopes`
- If inside a value block, extend the scope's range to match the value block's outer range

### 4. Handling Block Fallthroughs
When a terminal has a fallthrough (not a simple branch):
- Extend all active scopes whose `range.end > terminal.id` to at least the first instruction of the fallthrough block
- Push the fallthrough range onto the stack for future scopes

### 5. Handling Labeled Breaks (Goto)
When encountering a goto to a label (not the natural fallthrough):
- Find the corresponding fallthrough range on the stack
- Extend all active scopes to span from the label start to its fallthrough end

### 6. Value Block Handling
For ternary, logical, and optional terminals:
- Create `ValueBlockNode` to track the outer block's instruction range
- Scopes inside value blocks inherit this range, ensuring they align to the outer block scope

## Key Data Structures

```typescript
type ValueBlockNode = {
  kind: 'node';
  id: InstructionId;
  valueRange: MutableRange;  // Range of outer block scope
  children: Array<ValueBlockNode | ReactiveScopeNode>;
};

type ReactiveScopeNode = {
  kind: 'scope';
  id: InstructionId;
  scope: ReactiveScope;
};

// Tracked during traversal:
activeBlockFallthroughRanges: Array<{
  range: InstructionRange;
  fallthrough: BlockId;
}>;
activeScopes: Set<ReactiveScope>;
valueBlockNodes: Map<BlockId, ValueBlockNode>;
```

## Edge Cases

### Labeled Breaks
When a `goto` jumps to a label (not the natural fallthrough), scopes must be extended to include the entire labeled block range, preventing the break from jumping out of the scope.

### Value Blocks (Ternary/Logical/Optional)
These create nested "value" contexts. Scopes inside must be aligned to the outer block scope's boundaries, not the value block's boundaries.

### Nested Control Flow
Deeply nested if-statements require the scope to be extended through all levels back to the outermost block where the scope started.

### do-while and try/catch
The terminal's successor might be a block (not value block), which is handled specially.

## TODOs
1. `// TODO: consider pruning activeScopes per instruction` - Currently, `activeScopes` is only pruned at block start points. Some scopes may no longer be active by the time a goto is encountered.

2. `// TODO: add a variant of eachTerminalSuccessor() that visits _all_ successors, not just those that are direct successors for normal control-flow ordering.` - The current implementation uses `mapTerminalSuccessors` which may not visit all successors in all cases.

## Example

### Fixture: `extend-scopes-if.js`

**Input:**
```javascript
function foo(a, b, c) {
  let x = [];
  if (a) {
    if (b) {
      if (c) {
        x.push(0);  // Mutation of x ends here (instruction 12-13)
      }
    }
  }
  if (x.length) {  // instruction 16
    return x;
  }
  return null;
}
```

**Before AlignReactiveScopesToBlockScopesHIR:**
```
x$23_@0[1:13]  // Scope range 1-13
```
The scope for `x` ends at instruction 13 (inside the innermost if block).

**After AlignReactiveScopesToBlockScopesHIR:**
```
x$23_@0[1:16]  // Scope range extended to 1-16
```
The scope is extended to instruction 16 (the first instruction after all the nested if-blocks), aligning to the block scope boundary.

**Generated Code:**
```javascript
function foo(a, b, c) {
  const $ = _c(4);
  let x;
  if ($[0] !== a || $[1] !== b || $[2] !== c) {
    x = [];
    if (a) {
      if (b) {
        if (c) {
          x.push(0);
        }
      }
    }
    // Scope ends here, after ALL the if-blocks
    $[0] = a;
    $[1] = b;
    $[2] = c;
    $[3] = x;
  } else {
    x = $[3];
  }
  // Code outside the scope
  if (x.length) {
    return x;
  }
  return null;
}
```

The memoization block correctly wraps the entire nested if-structure, not just part of it.
