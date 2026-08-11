# validateNoCapitalizedCalls

## File
`src/Validation/ValidateNoCapitalizedCalls.ts`

## Purpose
This validation pass ensures that capitalized functions are not called directly in a component. In React, capitalized functions are conventionally reserved for components, which should be invoked via JSX syntax rather than direct function calls.

Direct calls to capitalized functions can cause issues because:
1. Components may contain hooks, and calling them directly violates the Rules of Hooks
2. The React runtime expects components to be rendered via JSX for proper reconciliation
3. Direct calls bypass React's rendering lifecycle and state management

This validation is opt-in and controlled by the `validateNoCapitalizedCalls` configuration option.

## Input Invariants
- The function has been lowered to HIR
- Global bindings have been resolved
- The `validateNoCapitalizedCalls` configuration option is enabled (via pragma or config)

## Validation Rules

### Rule 1: No Direct Calls to Capitalized Globals
Capitalized global functions (not in the allowlist) cannot be called directly.

**Error:**
```
Error: Capitalized functions are reserved for components, which must be invoked with JSX. If this is a component, render it with JSX. Otherwise, ensure that it has no hook calls and rename it to begin with a lowercase letter. Alternatively, if you know for a fact that this function is not a component, you can allowlist it via the compiler config

[FunctionName] may be a component.
```

### Rule 2: No Direct Method Calls to Capitalized Properties
Capitalized methods on objects cannot be called directly.

**Error:**
```
Error: Capitalized functions are reserved for components, which must be invoked with JSX. If this is a component, render it with JSX. Otherwise, ensure that it has no hook calls and rename it to begin with a lowercase letter. Alternatively, if you know for a fact that this function is not a component, you can allowlist it via the compiler config

[MethodName] may be a component.
```

## Algorithm

### Phase 1: Build Allowlist
```typescript
const ALLOW_LIST = new Set([
  ...DEFAULT_GLOBALS.keys(),           // Built-in globals (Array, Object, etc.)
  ...(envConfig.validateNoCapitalizedCalls ?? []),  // User-configured allowlist
]);

const isAllowed = (name: string): boolean => {
  return ALLOW_LIST.has(name);
};
```

### Phase 2: Track Capitalized Globals and Properties
```typescript
const capitalLoadGlobals = new Map<IdentifierId, string>();
const capitalizedProperties = new Map<IdentifierId, string>();
```

### Phase 3: Scan Instructions
```typescript
for (const instr of block.instructions) {
  switch (value.kind) {
    case 'LoadGlobal':
      // Track capitalized globals (excluding CONSTANTS)
      if (
        value.binding.name !== '' &&
        /^[A-Z]/.test(value.binding.name) &&
        !(value.binding.name.toUpperCase() === value.binding.name) &&
        !isAllowed(value.binding.name)
      ) {
        capitalLoadGlobals.set(lvalue.identifier.id, value.binding.name);
      }
      break;

    case 'CallExpression':
      // Check if calling a tracked capitalized global
      const calleeName = capitalLoadGlobals.get(value.callee.identifier.id);
      if (calleeName != null) {
        CompilerError.throwInvalidReact({
          reason: 'Capitalized functions are reserved for components...',
          description: `${calleeName} may be a component`,
          ...
        });
      }
      break;

    case 'PropertyLoad':
      // Track capitalized properties
      if (typeof value.property === 'string' && /^[A-Z]/.test(value.property)) {
        capitalizedProperties.set(lvalue.identifier.id, value.property);
      }
      break;

    case 'MethodCall':
      // Check if calling a tracked capitalized property
      const propertyName = capitalizedProperties.get(value.property.identifier.id);
      if (propertyName != null) {
        errors.push({
          reason: 'Capitalized functions are reserved for components...',
          description: `${propertyName} may be a component`,
          ...
        });
      }
      break;
  }
}
```

## Edge Cases

### ALL_CAPS Constants
Functions with names that are entirely uppercase (like `CONSTANTS`) are not flagged:
```javascript
const x = MY_CONSTANT(); // Not an error - all caps indicates a constant, not a component
const y = MyComponent(); // Error - PascalCase indicates a component
```

### Built-in Globals
The default globals from `DEFAULT_GLOBALS` are automatically allowlisted:
```javascript
const arr = Array(5);    // OK - Array is a built-in
const obj = Object.create(null);  // OK - Object is a built-in
```

### User-Configured Allowlist
Users can allowlist specific functions via configuration:
```typescript
validateNoCapitalizedCalls: ['MyUtility', 'SomeFactory']
```

### Method Calls vs Function Calls
Both direct function calls and method calls on objects are checked:
```javascript
MyComponent();           // Error - direct call
someObject.MyComponent(); // Error - method call
```

### Chained Property Access
Only the immediate property being called is checked:
```javascript
a.b.MyComponent(); // Only checks if MyComponent is capitalized
```

## TODOs
None in the source file.

## Example

### Fixture: `error.capitalized-function-call.js`

**Input:**
```javascript
// @validateNoCapitalizedCalls
function Component() {
  const x = SomeFunc();

  return x;
}
```

**Error:**
```
Error: Capitalized functions are reserved for components, which must be invoked with JSX. If this is a component, render it with JSX. Otherwise, ensure that it has no hook calls and rename it to begin with a lowercase letter. Alternatively, if you know for a fact that this function is not a component, you can allowlist it via the compiler config

SomeFunc may be a component.

error.capitalized-function-call.ts:3:12
  1 | // @validateNoCapitalizedCalls
  2 | function Component() {
> 3 |   const x = SomeFunc();
    |             ^^^^^^^^^^ Capitalized functions are reserved for components...
  4 |
  5 |   return x;
  6 | }
```

### Fixture: `error.capitalized-method-call.js`

**Input:**
```javascript
// @validateNoCapitalizedCalls
function Component() {
  const x = someGlobal.SomeFunc();

  return x;
}
```

**Error:**
```
Error: Capitalized functions are reserved for components, which must be invoked with JSX. If this is a component, render it with JSX. Otherwise, ensure that it has no hook calls and rename it to begin with a lowercase letter. Alternatively, if you know for a fact that this function is not a component, you can allowlist it via the compiler config

SomeFunc may be a component.

error.capitalized-method-call.ts:3:12
  1 | // @validateNoCapitalizedCalls
  2 | function Component() {
> 3 |   const x = someGlobal.SomeFunc();
    |             ^^^^^^^^^^^^^^^^^^^^^ Capitalized functions are reserved for components...
  4 |
  5 |   return x;
  6 | }
```

### Fixture: `capitalized-function-allowlist.js` (No Error)

**Input:**
```javascript
// @validateNoCapitalizedCalls:["SomeFunc"]
function Component() {
  const x = SomeFunc();
  return x;
}
```

**Output:**
Compiles successfully because `SomeFunc` is in the allowlist.
