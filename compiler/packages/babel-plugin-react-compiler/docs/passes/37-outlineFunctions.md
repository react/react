# outlineFunctions

## File
`src/Optimization/OutlineFunctions.ts`

## Purpose
This pass outlines pure function expressions that have no captured context into top-level helper functions. By moving these functions outside the component, they become truly static and can be shared across renders without any memoization overhead.

A function with no captured context is completely self-contained - it only uses its parameters and globals. Such functions don't need to be recreated on each render and can be hoisted to module scope.

## Input Invariants
- The `enableFunctionOutlining` feature flag must be enabled
- Functions must have `context.length === 0` (no captured variables)
- Functions must be anonymous (no `id` property)
- Functions must not be FBT macro operands (tracked by `fbtOperands` parameter)

## Output Guarantees
- Pure function expressions are replaced with `LoadGlobal` of the outlined function
- Outlined functions are registered with the environment for emission
- The original instruction is transformed to load the global

## Algorithm

```typescript
export function outlineFunctions(
  fn: HIRFunction,
  fbtOperands: Set<IdentifierId>,
): void {
  for (const [, block] of fn.body.blocks) {
    for (let i = 0; i < block.instructions.length; i++) {
      const instr = block.instructions[i]!;

      if (
        instr.value.kind === 'FunctionExpression' &&
        instr.value.loweredFunc.func.context.length === 0 &&
        instr.value.loweredFunc.func.id === null &&
        !fbtOperands.has(instr.lvalue.identifier.id)
      ) {
        // Outline this function
        const outlinedId = fn.env.outlineFunction(
          instr.value.loweredFunc.func,
          'helper',
        );

        // Replace with LoadGlobal
        instr.value = {
          kind: 'LoadGlobal',
          binding: {
            kind: 'ModuleLocal',
            name: outlinedId,
          },
          loc: instr.value.loc,
        };
      }
    }
  }
}
```

## Edge Cases

### Functions with Context
Functions that capture variables are not outlined:
```javascript
function Component(props) {
  const x = props.value;
  const fn = () => x * 2;  // Captures x, not outlined
}
```

### Named Functions
Functions with explicit names are not outlined:
```javascript
const foo = function namedFn() { ... };  // Has id, not outlined
```

### FBT Operands
Functions used as FBT operands cannot be outlined due to translation requirements:
```javascript
<fbt>
  Hello <fbt:param name="user">{() => getName()}</fbt:param>
</fbt>
// The function cannot be outlined - FBT needs it inline
```

### Arrow Functions vs Function Expressions
Both arrow functions and function expressions are candidates:
```javascript
const a = () => 1;           // Outlined if no context
const b = function() {};     // Outlined if no context
```

### Recursive Functions
Self-referencing functions cannot be outlined (they would have themselves in context):
```javascript
const fib = (n) => n <= 1 ? n : fib(n-1) + fib(n-2);  // References self
```

## TODOs
None in the source file.

## Example

### Fixture: `outlined-helper.js`

**Input:**
```javascript
// @enableFunctionOutlining
function Component(props) {
  return (
    <div>
      {props.items.map(item => (
        <Stringify key={item.id} item={item.name} />
      ))}
    </div>
  );
}
```

**Analysis:**
The map callback `item => <Stringify .../>` has one captured variable: nothing from the component (only uses `item` parameter). However, it receives `item` as a parameter, not from context.

If we have a truly pure helper:
```javascript
// @enableFunctionOutlining
function Component(props) {
  const double = (x) => x * 2;  // No context, pure
  return <div>{double(props.value)}</div>;
}
```

**After OutlineFunctions:**
```
// Outlined to module scope:
function _outlined_double$1(x) {
  return x * 2;
}

// In component:
[1] $1 = LoadGlobal _outlined_double$1  // Instead of FunctionExpression
[2] StoreLocal Const double = $1
```

**Generated Code:**
```javascript
function _outlined_double$1(x) {
  return x * 2;
}

function Component(props) {
  const $ = _c(2);
  const double = _outlined_double$1;  // Just a reference, no recreation
  let t0;
  if ($[0] !== props.value) {
    t0 = <div>{double(props.value)}</div>;
    $[0] = props.value;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}
```

Key observations:
- The pure function is hoisted to module scope
- The component just references the outlined function
- No memoization needed for the function itself
- Reduces runtime overhead by avoiding function recreation
