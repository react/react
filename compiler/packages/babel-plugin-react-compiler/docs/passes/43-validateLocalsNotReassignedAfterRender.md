# validateLocalsNotReassignedAfterRender

## File
`src/Validation/ValidateLocalsNotReassignedAfterRender.ts`

## Purpose
This validation pass prevents a category of bugs where a closure captures a binding from one render but does not update when the binding is reassigned in a later render.

When the React Compiler memoizes a function, that function captures bindings at the time of creation. If the function is reused across renders (because its dependencies haven't changed), any reassignments to captured variables will affect the wrong binding version. This can cause inconsistent behavior that's difficult to debug.

The pass detects when:
1. A local variable is reassigned within a function expression
2. That function expression escapes (e.g., passed to useEffect, used as event handler)
3. The reassignment would occur after render completes (in effects or async callbacks)

## Input Invariants
- The function has been lowered to HIR
- Effects have been inferred for all operands (`operand.effect !== Effect.Unknown`)
- Function signatures have been analyzed for `noAlias` properties

## Validation Rules

### Rule 1: No Reassignment After Render
Variables cannot be reassigned in functions that escape to be called after render.

**Error:**
```
Error: Cannot reassign variable after render completes

Reassigning `[variable]` after render has completed can cause inconsistent behavior on subsequent renders. Consider using state instead.
```

### Rule 2: No Reassignment in Async Functions
Variables cannot be reassigned within async functions (async functions always execute after render).

**Error:**
```
Error: Cannot reassign variable in async function

Reassigning a variable in an async function can cause inconsistent behavior on subsequent renders. Consider using state instead.
```

## Algorithm

### Phase 1: Track Context Variables
Context variables are variables declared in the outer component/hook that are captured by inner functions:

```typescript
const contextVariables = new Set<IdentifierId>();

// For DeclareContext in the main function, add to tracking
case 'DeclareContext':
  if (!isFunctionExpression) {
    contextVariables.add(value.lvalue.place.identifier.id);
  }
  break;
```

### Phase 2: Detect Reassigning Functions
The pass tracks which functions contain reassignments to context variables:

```typescript
const reassigningFunctions = new Map<IdentifierId, Place>();

case 'FunctionExpression':
case 'ObjectMethod':
  // Recursively check if the function reassigns context variables
  let reassignment = getContextReassignment(
    value.loweredFunc.func,
    contextVariables,
    true,  // isFunctionExpression
    isAsync || value.loweredFunc.func.async
  );

  // Also check if any captured functions reassign
  if (reassignment === null) {
    for (const operand of eachInstructionValueOperand(value)) {
      const fromOperand = reassigningFunctions.get(operand.identifier.id);
      if (fromOperand !== undefined) {
        reassignment = fromOperand;
        break;
      }
    }
  }

  if (reassignment !== null) {
    // If async, error immediately
    if (isAsync || value.loweredFunc.func.async) {
      throw new CompilerError("Cannot reassign variable in async function");
    }
    // Otherwise, track this function as reassigning
    reassigningFunctions.set(lvalue.identifier.id, reassignment);
  }
  break;
```

### Phase 3: Detect Reassignment in Function Expression
Within a function expression, a `StoreContext` to a context variable is a reassignment:

```typescript
case 'StoreContext':
  if (isFunctionExpression) {
    if (contextVariables.has(value.lvalue.place.identifier.id)) {
      return value.lvalue.place;  // Found a reassignment
    }
  } else {
    // In main function, just track the context variable
    contextVariables.add(value.lvalue.place.identifier.id);
  }
  break;
```

### Phase 4: Propagate Reassignment Through Data Flow
Reassigning functions flow through local/context stores:

```typescript
case 'StoreLocal':
case 'StoreContext':
  const reassignment = reassigningFunctions.get(value.value.identifier.id);
  if (reassignment !== undefined) {
    reassigningFunctions.set(value.lvalue.place.identifier.id, reassignment);
    reassigningFunctions.set(lvalue.identifier.id, reassignment);
  }
  break;

case 'LoadLocal':
  const reassignment = reassigningFunctions.get(value.place.identifier.id);
  if (reassignment !== undefined) {
    reassigningFunctions.set(lvalue.identifier.id, reassignment);
  }
  break;
```

### Phase 5: Check Escape Points
When a reassigning function is used as an operand with `Effect.Freeze`, it means the function escapes (e.g., passed to a hook, used as a prop):

```typescript
for (const operand of operands) {
  const reassignment = reassigningFunctions.get(operand.identifier.id);
  if (reassignment !== undefined) {
    if (operand.effect === Effect.Freeze) {
      // Function escapes - this is an error
      return reassignment;
    } else {
      // Function doesn't escape yet, propagate to lvalues
      for (const lval of eachInstructionLValue(instr)) {
        reassigningFunctions.set(lval.identifier.id, reassignment);
      }
    }
  }
}
```

### Phase 6: Check Terminal Operands
Reassigning functions used in terminal operands (like return) also escape:

```typescript
for (const operand of eachTerminalOperand(block.terminal)) {
  const reassignment = reassigningFunctions.get(operand.identifier.id);
  if (reassignment !== undefined) {
    return reassignment;
  }
}
```

### NoAlias Optimization
For function calls with `noAlias` signatures, only the callee needs to be checked (not all arguments):

```typescript
if (value.kind === 'CallExpression') {
  const signature = getFunctionCallSignature(fn.env, value.callee.identifier.type);
  if (signature?.noAlias) {
    operands = [value.callee];  // Only check the callee
  }
}
```

## Edge Cases

### Nested Async Functions
Async functions are always detected as problematic, regardless of nesting level:
```javascript
function Component() {
  let x = 0;
  const f = async () => {
    const g = () => {
      x = 1;  // Error: in async context
    };
  };
}
```

### Function Composition
If a reassigning function is captured by another function, that outer function is also marked as reassigning:
```javascript
function Component() {
  let x = 0;
  const reassign = () => { x = 1; };
  const wrapper = () => { reassign(); };
  useEffect(wrapper);  // Error: wrapper contains reassign
}
```

### NoAlias Functions
Functions with `noAlias` signatures don't let their arguments escape, so passing a reassigning function to them is safe:
```javascript
function Component() {
  let x = 0;
  const f = () => { x = 1; };
  console.log(f);  // OK: console.log has noAlias, f doesn't escape
}
```

### Direct Effect Usage
The most common case is passing a reassigning function to useEffect:
```javascript
function Component() {
  let local;
  const reassign = () => { local = 'new value'; };
  useEffect(() => { reassign(); }, []);  // Error
}
```

## TODOs
None in the source file.

## Example

### Fixture: `error.invalid-reassign-local-variable-in-effect.js`

**Input:**
```javascript
import {useEffect} from 'react';

function Component() {
  let local;

  const reassignLocal = newValue => {
    local = newValue;
  };

  const onMount = newValue => {
    reassignLocal('hello');

    if (local === newValue) {
      // Without React Compiler, `reassignLocal` is freshly created
      // on each render, capturing a binding to the latest `local`,
      // such that invoking reassignLocal will reassign the same
      // binding that we are observing in the if condition, and
      // we reach this branch
      console.log('`local` was updated!');
    } else {
      // With React Compiler enabled, `reassignLocal` is only created
      // once, capturing a binding to `local` in that render pass.
      // Therefore, calling `reassignLocal` will reassign the wrong
      // version of `local`, and not update the binding we are checking
      // in the if condition.
      throw new Error('`local` not updated!');
    }
  };

  useEffect(() => {
    onMount();
  }, [onMount]);

  return 'ok';
}
```

**Error:**
```
Error: Cannot reassign variable after render completes

Reassigning `local` after render has completed can cause inconsistent behavior on subsequent renders. Consider using state instead.

error.invalid-reassign-local-variable-in-effect.ts:7:4
   5 |
   6 |   const reassignLocal = newValue => {
>  7 |     local = newValue;
     |     ^^^^^ Cannot reassign `local` after render completes
   8 |   };
   9 |
  10 |   const onMount = newValue => {
```

### Fixture: `error.invalid-reassign-local-variable-in-async-callback.js`

**Input:**
```javascript
function Component() {
  let value = null;
  const reassign = async () => {
    await foo().then(result => {
      // Reassigning a local variable in an async function is *always* mutating
      // after render, so this should error regardless of where this ends up
      // getting called
      value = result;
    });
  };

  const onClick = async () => {
    await reassign();
  };
  return <div onClick={onClick}>Click</div>;
}
```

**Error:**
```
Error: Cannot reassign variable in async function

Reassigning a variable in an async function can cause inconsistent behavior on subsequent renders. Consider using state instead.

error.invalid-reassign-local-variable-in-async-callback.ts:8:6
   6 |       // after render, so this should error regardless of where this ends up
   7 |       // getting called
>  8 |       value = result;
     |       ^^^^^ Cannot reassign `value`
   9 |     });
  10 |   };
```
