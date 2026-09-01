# validateSourceLocations

## File
`src/Validation/ValidateSourceLocations.ts`

## Purpose
**IMPORTANT: This validation is intended for unit tests only, not production use.**

Validates that important source locations from the original code are preserved in the generated AST. This ensures that code coverage instrumentation tools (like Istanbul) can properly map back to the original source code for accurate coverage reports.

## Input Invariants
- Operates on the original Babel AST (`NodePath<FunctionDeclaration | ArrowFunctionExpression | FunctionExpression>`)
- Operates on the generated CodegenFunction output
- Must run after code generation

## Validation Rules
The pass checks that "important" source locations (as defined by Istanbul's instrumentation requirements) are preserved in the generated output.

### Two types of errors:

1. **Missing location:**
```
Important source location missing in generated code. Source location for [NodeType]
is missing in the generated output. This can cause coverage instrumentation to fail
to track this code properly, resulting in inaccurate coverage reports.
```

2. **Wrong node type:**
```
Important source location has wrong node type in generated code. Source location for
[ExpectedType] exists in the generated output but with wrong node type(s): [ActualTypes].
This can cause coverage instrumentation to fail to track this code properly.
```

### Important Node Types
The following node types are considered important for coverage tracking:
```typescript
const IMPORTANT_INSTRUMENTED_TYPES = new Set([
  'ArrowFunctionExpression',
  'AssignmentPattern',
  'ObjectMethod',
  'ExpressionStatement',
  'BreakStatement',
  'ContinueStatement',
  'ReturnStatement',
  'ThrowStatement',
  'TryStatement',
  'VariableDeclarator',
  'IfStatement',
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'WhileStatement',
  'DoWhileStatement',
  'SwitchStatement',
  'SwitchCase',
  'WithStatement',
  'FunctionDeclaration',
  'FunctionExpression',
  'LabeledStatement',
  'ConditionalExpression',
  'LogicalExpression',
  'VariableDeclaration',
  'Identifier',
]);
```

### Strict Node Types
For these types, both the location AND node type must match:
- `VariableDeclaration`
- `VariableDeclarator`
- `Identifier`

## Algorithm

### Step 1: Collect Important Original Locations
Traverse the original AST and collect locations from nodes whose types are in `IMPORTANT_INSTRUMENTED_TYPES`:
- Skip nodes that are manual memoization calls (`useMemo`/`useCallback`) since the compiler intentionally removes these
- Build a map from location key to `{loc, nodeTypes}`

### Step 2: Collect Generated Locations
Recursively traverse the generated AST (main function body + outlined functions) and collect all locations with their node types.

### Step 3: Validate Preservation
For each important original location:
- If the location is completely missing in generated output, report an error
- For strict node types, verify the specific node type is present
- Handle cases where a generated location has a different node type

### Location Key Format
Locations are compared using a string key:
```typescript
function locationKey(loc: SourceLocation): string {
  return `${loc.start.line}:${loc.start.column}-${loc.end.line}:${loc.end.column}`;
}
```

## Edge Cases

### Manual Memoization Removal
The compiler intentionally removes `useMemo` and `useCallback` calls (replacing them with compiler-generated memoization). These are detected and exempted from validation:
```typescript
function isManualMemoization(node: Node): boolean {
  // Checks for useMemo/useCallback or React.useMemo/React.useCallback
}
```

### Outlined Functions
The validation also checks locations in outlined functions (functions extracted by the compiler for optimization purposes).

### Multiple Node Types at Same Location
Multiple node types can share the same location (e.g., a `VariableDeclarator` and its `Identifier` child). The pass tracks all node types for each location.

## TODOs
From the file documentation:
> There's one big gotcha with this validation: it only works if the "important" original nodes are not optimized away by the compiler.
>
> When that scenario happens, we should just update the fixture to not include a node that has no corresponding node in the generated AST due to being completely removed during compilation.

## Example

### Fixture: `error.todo-missing-source-locations.js`

**Input:**
```javascript
// @validateSourceLocations
import {useEffect, useCallback} from 'react';

function Component({prop1, prop2}) {
  const x = prop1 + prop2;
  const y = x * 2;
  const arr = [x, y];
  const obj = {x, y};
  let destA, destB;
  if (y > 5) {
    [destA, destB] = arr;
  }

  const [a, b] = arr;
  const {x: c, y: d} = obj;
  let sound;

  if (y > 10) {
    sound = 'woof';
  } else {
    sound = 'meow';
  }

  useEffect(() => {
    if (a > 10) {
      console.log(a);
      console.log(sound);
      console.log(destA, destB);
    }
  }, [a, sound, destA, destB]);

  const foo = useCallback(() => {
    return a + b;
  }, [a, b]);

  function bar() {
    return (c + d) * 2;
  }

  console.log('Hello, world!');

  return [y, foo, bar];
}
```

**Error (partial):**
```
Found 25 errors:

Todo: Important source location missing in generated code
Source location for Identifier is missing in the generated output...

error.todo-missing-source-locations.ts:4:9
> 4 | function Component({prop1, prop2}) {
    |          ^^^^^^^^^

Todo: Important source location missing in generated code
Source location for VariableDeclaration is missing in the generated output...

error.todo-missing-source-locations.ts:9:2
>  9 |   let destA, destB;
     |   ^^^^^^^^^^^^^^^^^

Todo: Important source location missing in generated code
Source location for ExpressionStatement is missing in the generated output...

error.todo-missing-source-locations.ts:11:4
> 11 |     [destA, destB] = arr;
     |     ^^^^^^^^^^^^^^^^^^^^^
```

**Why it fails:** The compiler transforms the code significantly, and many original source locations are not preserved in the output. This causes coverage tools to lose track of which lines were executed.

**Note:** This fixture is prefixed with `error.todo-` indicating this is a known limitation that needs to be addressed.
