# optimizePropsMethodCalls

## File
`src/Optimization/OptimizePropsMethodCalls.ts`

## Purpose
This pass converts method calls on the props object to regular function calls. Method calls like `props.onClick()` are transformed to `const t0 = props.onClick; t0()`. This normalization enables better analysis and optimization by the compiler.

The transformation is important because method calls have different semantics than regular calls - the receiver (`props`) would normally be passed as `this` to the method. For React props, methods are typically just callback functions where `this` binding doesn't matter, so converting them to regular calls is safe and enables better memoization.

## Input Invariants
- The function has been through type inference
- Props parameters are typed as `TObject<BuiltInProps>`

## Output Guarantees
- All `MethodCall` instructions where the receiver has props type are converted to `CallExpression`
- The method property becomes the callee of the call
- Arguments are preserved exactly

## Algorithm

```typescript
export function optimizePropsMethodCalls(fn: HIRFunction): void {
  for (const [, block] of fn.body.blocks) {
    for (let i = 0; i < block.instructions.length; i++) {
      const instr = block.instructions[i]!;

      if (
        instr.value.kind === 'MethodCall' &&
        isPropsType(instr.value.receiver.identifier)
      ) {
        // Transform: props.onClick(arg)
        // To: const t0 = props.onClick; t0(arg)
        instr.value = {
          kind: 'CallExpression',
          callee: instr.value.property,  // The method becomes the callee
          args: instr.value.args,
          loc: instr.value.loc,
        };
      }
    }
  }
}

function isPropsType(identifier: Identifier): boolean {
  return (
    identifier.type.kind === 'Object' &&
    identifier.type.shapeId === BuiltInPropsId
  );
}
```

## Edge Cases

### Non-Props Method Calls
Method calls on non-props objects are left unchanged:
```javascript
// Unchanged - array.map is not on props
array.map(x => x * 2)

// Unchanged - obj is not props
obj.method()
```

### Props Type Detection
The pass uses type information to identify props:
```javascript
function Component(props) {
  // props has type TObject<BuiltInProps>
  props.onClick();  // Transformed
}

function Regular(obj) {
  // obj has unknown type
  obj.onClick();  // Not transformed
}
```

### Nested Props Access
Only direct method calls on props are transformed:
```javascript
props.onClick();       // Transformed
props.nested.onClick(); // Not transformed (receiver is props.nested, not props)
```

### Arrow Function Callbacks
Works with any method on props:
```javascript
props.onChange(value);   // Transformed
props.onSubmit(data);    // Transformed
props.validate(input);   // Transformed
```

## TODOs
None in the source file.

## Example

### Fixture: Using props method

**Input:**
```javascript
function Component(props) {
  return <button onClick={() => props.onClick()} />;
}
```

**Before OptimizePropsMethodCalls:**
```
[1] $5 = Function @context[props$1] ...
    <<anonymous>>():
      [1] $2 = LoadLocal props$1
      [2] $3 = PropertyLoad $2.onClick
      [3] $4 = MethodCall $2.$3()  // Method call on props
      [4] Return Void
```

**After OptimizePropsMethodCalls:**
```
[1] $5 = Function @context[props$1] ...
    <<anonymous>>():
      [1] $2 = LoadLocal props$1
      [2] $3 = PropertyLoad $2.onClick
      [3] $4 = Call $3()  // Now a regular call
      [4] Return Void
```

Key observations:
- `MethodCall $2.$3()` becomes `Call $3()`
- The property load (`$3 = PropertyLoad $2.onClick`) is preserved
- The receiver (`$2`) is no longer part of the call
- This enables the compiler to analyze `onClick` as a regular function
