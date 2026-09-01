# validateNoJSXInTryStatement

## File
`src/Validation/ValidateNoJSXInTryStatement.ts`

## Purpose
Validates that JSX is not created within a try block. Developers may incorrectly assume that wrapping JSX in try/catch will catch rendering errors, but React does not immediately render components when JSX is created - JSX is just a description of UI that will be rendered later. Error boundaries should be used instead.

See: https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary

## Input Invariants
- Operates on HIRFunction (pre-reactive scope inference)
- Blocks are traversed in order
- Only runs when `outputMode === 'lint'`

## Validation Rules
The pass errors when `JsxExpression` or `JsxFragment` instructions are found within a try block.

**Error message:**
```
Error: Avoid constructing JSX within try/catch

React does not immediately render components when JSX is rendered, so any errors from this component will not be caught by the try/catch. To catch errors in rendering a given component, wrap that component in an error boundary.
```

### Important distinction
- JSX in a **try block**: Error
- JSX in a **catch block** (not nested in outer try): Allowed
- JSX in a **catch block** (nested in outer try): Error

## Algorithm
1. Maintain a stack `activeTryBlocks` of currently active try statement handler block IDs
2. For each block:
   - Remove the current block from `activeTryBlocks` if it matches a handler (we've exited the try scope)
   - If `activeTryBlocks` is not empty (we're inside a try block):
     - Check each instruction for `JsxExpression` or `JsxFragment`
     - If found, push an error
   - If the block's terminal is a `try` terminal, push its handler block ID to `activeTryBlocks`

### Block tracking with `retainWhere`
The `retainWhere` utility is used to remove the current block from `activeTryBlocks` at the start of each block. When we reach a catch handler block, it gets removed from the active list, allowing JSX in catch blocks (unless there's an outer try).

## Edge Cases

### Allowed: JSX in catch (no outer try)
```javascript
// Valid - catch block is not inside a try
function Component() {
  try {
    doSomething();
  } catch {
    return <ErrorMessage />; // OK
  }
}
```

### Error: JSX in catch with outer try
```javascript
// Error - catch is inside outer try
function Component() {
  try {
    try {
      doSomething();
    } catch {
      return <ErrorMessage />; // Error!
    }
  } catch {
    return null;
  }
}
```

### Error: JSX assigned in try
```javascript
// Error - JSX creation is in try block
function Component() {
  let el;
  try {
    el = <div />; // Error here
  } catch {
    return null;
  }
  return el;
}
```

### Finally blocks
The validation currently has TODOs for handling try/catch/finally properly. Files like `error.todo-invalid-jsx-in-try-with-finally.js` indicate these are known unsupported cases.

## TODOs
Based on fixture naming patterns:
- `error.todo-invalid-jsx-in-try-with-finally.js` - Try blocks with finally clauses
- `error.todo-invalid-jsx-in-catch-in-outer-try-with-finally.js` - Nested try/catch in try with finally

## Example

### Fixture: `invalid-jsx-in-try-with-catch.js`

**Input:**
```javascript
// @loggerTestOnly @validateNoJSXInTryStatements @outputMode:"lint"
function Component(props) {
  let el;
  try {
    el = <div />;
  } catch {
    return null;
  }
  return el;
}
```

**Error:**
```
Error: Avoid constructing JSX within try/catch

React does not immediately render components when JSX is rendered, so any errors from this component will not be caught by the try/catch. To catch errors in rendering a given component, wrap that component in an error boundary.

invalid-jsx-in-try-with-catch.ts:5:9
  3 |   let el;
  4 |   try {
> 5 |     el = <div />;
    |          ^^^^^^^ Avoid constructing JSX within try/catch
  6 |   } catch {
  7 |     return null;
  8 |   }
```

**Why it fails:** The `<div />` JSX element is created inside a try block. If the developer expects this to catch errors from rendering the div, they will be surprised - the try/catch will only catch errors from creating the JSX object (which is rare), not from React actually rendering it later. The correct approach is to use an error boundary component to catch rendering errors.

### Fixture: `invalid-jsx-in-catch-in-outer-try-with-catch.js`

**Input:**
```javascript
// @loggerTestOnly @validateNoJSXInTryStatements @outputMode:"lint"
import {identity} from 'shared-runtime';

function Component(props) {
  let el;
  try {
    let value;
    try {
      value = identity(props.foo);
    } catch {
      el = <div value={value} />;
    }
  } catch {
    return null;
  }
  return el;
}
```

**Error:**
```
Error: Avoid constructing JSX within try/catch

...

invalid-jsx-in-catch-in-outer-try-with-catch.ts:11:11
   9 |       value = identity(props.foo);
  10 |     } catch {
> 11 |       el = <div value={value} />;
     |            ^^^^^^^^^^^^^^^^^^^^^ Avoid constructing JSX within try/catch
```

**Why it fails:** Even though the JSX is in a catch block, that catch block is itself inside an outer try block. The outer try's catch won't catch rendering errors from the JSX any more than the inner try would.
