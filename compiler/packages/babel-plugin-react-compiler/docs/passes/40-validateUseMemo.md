# validateUseMemo

## File
`src/Validation/ValidateUseMemo.ts`

## Purpose
This validation pass ensures that `useMemo()` callbacks follow React's requirements. The pass checks for several common mistakes that developers make when using `useMemo()`:

1. Callbacks should not accept parameters (useMemo callbacks are called with no arguments)
2. Callbacks should not be async or generator functions (must return a value synchronously)
3. Callbacks should not reassign variables declared outside the callback (must be pure)
4. Callbacks should return a value (useMemo is for computing values, not side effects)
5. The result of useMemo should be used (not discarded)

## Input Invariants
- The function has been lowered to HIR
- `useMemo` is either imported directly or accessed via `React.useMemo`
- Function expressions have been lowered with their parameters and async/generator flags preserved

## Validation Rules

### Rule 1: No Parameters
useMemo callbacks must not accept parameters.

**Error:**
```
Error: useMemo() callbacks may not accept parameters

useMemo() callbacks are called by React to cache calculations across re-renders. They should not take parameters. Instead, directly reference the props, state, or local variables needed for the computation.
```

### Rule 2: No Async or Generator Functions
useMemo callbacks must synchronously return a value.

**Error:**
```
Error: useMemo() callbacks may not be async or generator functions

useMemo() callbacks are called once and must synchronously return a value.
```

### Rule 3: No Reassigning Outer Variables
useMemo callbacks cannot reassign variables declared outside the callback.

**Error:**
```
Error: useMemo() callbacks may not reassign variables declared outside of the callback

useMemo() callbacks must be pure functions and cannot reassign variables defined outside of the callback function.
```

### Rule 4: Must Return a Value (when `validateNoVoidUseMemo` is enabled)
useMemo callbacks should return a value.

**Error:**
```
Error: useMemo() callbacks must return a value

This useMemo() callback doesn't return a value. useMemo() is for computing and caching values, not for arbitrary side effects.
```

### Rule 5: Result Must Be Used (when `validateNoVoidUseMemo` is enabled)
The result of useMemo should be used somewhere.

**Error:**
```
Error: useMemo() result is unused

This useMemo() value is unused. useMemo() is for computing and caching values, not for arbitrary side effects.
```

## Algorithm

### Phase 1: Track useMemo References
```typescript
const useMemos = new Set<IdentifierId>();
const react = new Set<IdentifierId>();
const functions = new Map<IdentifierId, FunctionExpression>();
const unusedUseMemos = new Map<IdentifierId, SourceLocation>();
```

The pass tracks:
- Direct `useMemo` imports via `LoadGlobal`
- `React` imports to detect `React.useMemo` pattern
- Function expressions that might be useMemo callbacks
- Unused useMemo results

### Phase 2: Identify useMemo Calls
```typescript
for (const instr of block.instructions) {
  switch (value.kind) {
    case 'LoadGlobal':
      if (value.binding.name === 'useMemo') {
        useMemos.add(lvalue.identifier.id);
      } else if (value.binding.name === 'React') {
        react.add(lvalue.identifier.id);
      }
      break;
    case 'PropertyLoad':
      if (react.has(value.object.identifier.id) && value.property === 'useMemo') {
        useMemos.add(lvalue.identifier.id);
      }
      break;
    case 'CallExpression':
    case 'MethodCall':
      // Check if callee is useMemo
      const callee = value.kind === 'CallExpression' ? value.callee : value.property;
      if (useMemos.has(callee.identifier.id) && value.args.length > 0) {
        // Validate the callback
      }
      break;
  }
}
```

### Phase 3: Validate Callback
For each useMemo call, the pass retrieves the callback function expression and validates:

```typescript
const body = functions.get(arg.identifier.id);

// Check for parameters
if (body.loweredFunc.func.params.length > 0) {
  errors.push("useMemo() callbacks may not accept parameters");
}

// Check for async/generator
if (body.loweredFunc.func.async || body.loweredFunc.func.generator) {
  errors.push("useMemo() callbacks may not be async or generator functions");
}

// Check for context variable reassignment
validateNoContextVariableAssignment(body.loweredFunc.func, errors);

// Check for return value (if config enabled)
if (fn.env.config.validateNoVoidUseMemo) {
  if (!hasNonVoidReturn(body.loweredFunc.func)) {
    errors.push("useMemo() callbacks must return a value");
  }
}
```

### Phase 4: Validate No Context Variable Assignment
```typescript
function validateNoContextVariableAssignment(fn: HIRFunction, errors: CompilerError) {
  const context = new Set(fn.context.map(place => place.identifier.id));
  for (const block of fn.body.blocks.values()) {
    for (const instr of block.instructions) {
      if (value.kind === 'StoreContext') {
        if (context.has(value.lvalue.place.identifier.id)) {
          errors.push("Cannot reassign variable");
        }
      }
    }
  }
}
```

### Phase 5: Check for Unused Results
```typescript
// Track which useMemo results are referenced
for (const operand of eachInstructionValueOperand(value)) {
  unusedUseMemos.delete(operand.identifier.id);
}

// At the end, report any unused useMemos
for (const loc of unusedUseMemos.values()) {
  errors.push("useMemo() result is unused");
}
```

### Return Value Helper
```typescript
function hasNonVoidReturn(func: HIRFunction): boolean {
  for (const [, block] of func.body.blocks) {
    if (block.terminal.kind === 'return') {
      if (block.terminal.returnVariant === 'Explicit' ||
          block.terminal.returnVariant === 'Implicit') {
        return true;
      }
    }
  }
  return false;
}
```

## Edge Cases

### React.useMemo vs useMemo
The pass handles both import styles:
```javascript
import {useMemo} from 'react';
useMemo(() => x, [x]);

import React from 'react';
React.useMemo(() => x, [x]);
```

### Immediately Used Results
Results that are used immediately don't trigger the "unused" warning:
```javascript
const x = useMemo(() => compute(), [dep]);
return x; // x is used
```

### Void Return Detection
The pass checks for explicit and implicit returns. A function with only `return;` statements (void returns) will trigger the "must return a value" error.

### VoidUseMemo Errors as Logged Errors
The void useMemo errors (no return value, unused result) are logged via `fn.env.logErrors()` rather than thrown immediately. This allows them to be treated differently (e.g., as warnings) based on configuration.

## TODOs
None in the source file.

## Example

### Fixture: `error.invalid-useMemo-callback-args.js`

**Input:**
```javascript
function component(a, b) {
  let x = useMemo(c => a, []);
  return x;
}
```

**Error:**
```
Error: useMemo() callbacks may not accept parameters

useMemo() callbacks are called by React to cache calculations across re-renders. They should not take parameters. Instead, directly reference the props, state, or local variables needed for the computation.

error.invalid-useMemo-callback-args.ts:2:18
  1 | function component(a, b) {
> 2 |   let x = useMemo(c => a, []);
    |                   ^ Callbacks with parameters are not supported
  3 |   return x;
  4 | }
```

### Fixture: `error.invalid-useMemo-async-callback.js`

**Input:**
```javascript
function component(a, b) {
  let x = useMemo(async () => {
    await a;
  }, []);
  return x;
}
```

**Error:**
```
Error: useMemo() callbacks may not be async or generator functions

useMemo() callbacks are called once and must synchronously return a value.

error.invalid-useMemo-async-callback.ts:2:18
  1 | function component(a, b) {
> 2 |   let x = useMemo(async () => {
    |                   ^^^^^^^^^^^^^
> 3 |     await a;
    | ^^^^^^^^^^^^
> 4 |   }, []);
    | ^^^^ Async and generator functions are not supported
```

### Fixture: `error.invalid-reassign-variable-in-usememo.js`

**Input:**
```javascript
function Component() {
  let x;
  const y = useMemo(() => {
    let z;
    x = [];
    z = true;
    return z;
  }, []);
  return [x, y];
}
```

**Error:**
```
Error: useMemo() callbacks may not reassign variables declared outside of the callback

useMemo() callbacks must be pure functions and cannot reassign variables defined outside of the callback function.

error.invalid-reassign-variable-in-usememo.ts:5:4
  3 |   const y = useMemo(() => {
  4 |     let z;
> 5 |     x = [];
    |     ^ Cannot reassign variable
  6 |     z = true;
  7 |     return z;
  8 |   }, []);
```
