# validateStaticComponents

## File
`src/Validation/ValidateStaticComponents.ts`

## Purpose
Validates that components used in JSX are not created dynamically during render. Components created during render will have their state reset on every re-render because React sees them as new component types each time. This is a common React anti-pattern that causes bugs and poor performance.

## Input Invariants
- Operates on HIRFunction (pre-reactive transformation)
- All instructions and phi nodes are present
- JSX expressions have been lowered to `JsxExpression` instruction values

## Validation Rules
When a JSX element uses a component that was dynamically created during render, the pass produces:
```
Cannot create components during render. Components created during render will reset
their state each time they are created. Declare components outside of render
```

The error includes two locations:
1. Where the component is used in JSX
2. Where the component was originally created

### What constitutes "dynamically created"?
The following instruction kinds mark a value as dynamically created:
- `FunctionExpression` - An inline function definition
- `NewExpression` - A `new` constructor call
- `MethodCall` - A method call that returns a value
- `CallExpression` - A function call that returns a value

## Algorithm

1. Create a `Map<IdentifierId, SourceLocation>` called `knownDynamicComponents` to track identifiers whose values are dynamically created

2. Iterate through all blocks in evaluation order

3. For each block, first process phi nodes:
   - If any phi operand is in `knownDynamicComponents`, add the phi result to the map
   - This propagates dynamic-ness through control flow joins

4. For each instruction in the block:
   - **FunctionExpression, NewExpression, MethodCall, CallExpression**: Add the lvalue to `knownDynamicComponents` with its source location
   - **LoadLocal**: If the loaded value is dynamic, mark the lvalue as dynamic
   - **StoreLocal**: If the stored value is dynamic, mark both the lvalue and the store target as dynamic
   - **JsxExpression**: If the JSX tag is an identifier that is in `knownDynamicComponents`, push a diagnostic error

5. Return the collected errors

### Data Flow Tracking
The pass tracks how dynamic values flow through the program:
- Through variable assignments (`StoreLocal`, `LoadLocal`)
- Through phi nodes (conditional assignments)
- Into JSX component positions

## Edge Cases

### Conditionally Assigned Components
```javascript
function Example({cond}) {
  let Component;
  if (cond) {
    Component = createComponent();  // Dynamic!
  } else {
    Component = OtherComponent;     // Static
  }
  return <Component />;  // Error: Component may be dynamic
}
```
The phi node joins the conditional paths, and since one path is dynamic, the result is considered dynamic.

### Component Returned from Hooks/Functions
```javascript
function Example() {
  const Component = useCreateComponent();  // CallExpression - dynamic
  return <Component />;  // Error
}
```

### Factory Functions
```javascript
function Example() {
  const Component = createComponent();  // CallExpression - dynamic
  return <Component />;  // Error
}
```

### Safe Patterns (No Error)
```javascript
// Component defined outside render
const MyComponent = () => <div />;

function Example() {
  return <MyComponent />;  // OK - not created during render
}
```

## TODOs
None found in the source.

## Example

### Fixture: `static-components/invalid-dynamically-construct-component-in-render.js`

**Input:**
```javascript
// @validateStaticComponents
function Example(props) {
  const Component = createComponent();
  return <Component />;
}
```

**Error (from logs):**
```json
{
  "kind": "CompileError",
  "detail": {
    "options": {
      "category": "StaticComponents",
      "reason": "Cannot create components during render",
      "description": "Components created during render will reset their state each time they are created. Declare components outside of render",
      "details": [
        {
          "kind": "error",
          "loc": { "start": { "line": 4, "column": 10 } },
          "message": "This component is created during render"
        },
        {
          "kind": "error",
          "loc": { "start": { "line": 3, "column": 20 } },
          "message": "The component is created during render here"
        }
      ]
    }
  }
}
```

**Why it fails:** The `createComponent()` call creates a new component type on every render. When this component is used in JSX, React will see a different component type each time, causing the component to unmount and remount (losing all state) on every render.

### Fixture: `static-components/invalid-dynamically-constructed-component-function.js`

**Input:**
```javascript
// @validateStaticComponents
function Example(props) {
  const Component = () => <div />;
  return <Component />;
}
```

**Why it fails:** Even though this looks like a simple component definition, it creates a new function (and thus a new component type) on every render. The fix is to move the component definition outside of `Example`.
