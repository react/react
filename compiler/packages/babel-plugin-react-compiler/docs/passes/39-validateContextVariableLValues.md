# validateContextVariableLValues

## File
`src/Validation/ValidateContextVariableLValues.ts`

## Purpose
This validation pass ensures that all load/store references to a given named identifier are consistent with the "kind" of that variable (normal local variable or context variable). Context variables are variables that are captured by closures and require special handling for correct closure semantics.

The pass prevents mixing context variable operations (`DeclareContext`, `StoreContext`, `LoadContext`) with local variable operations (`DeclareLocal`, `StoreLocal`, `LoadLocal`, `Destructure`) on the same identifier.

## Input Invariants
- The function has been lowered to HIR
- All instructions have been categorized by kind
- Nested function expressions have been lowered

## Validation Rules

### Rule 1: Consistent Variable Kind
All references to the same identifier must use consistent load/store operations:
- Context variables must only use `DeclareContext`, `StoreContext`, `LoadContext`
- Local variables must only use `DeclareLocal`, `StoreLocal`, `LoadLocal`

**Error (Invariant violation):**
```
Expected all references to a variable to be consistently local or context references
Identifier [place] is referenced as a [kind] variable, but was previously referenced as a [prev.kind] variable
```

### Rule 2: No Destructuring of Context Variables
Context variables cannot be destructured using the `Destructure` instruction.

**Error (Todo):**
```
Support destructuring of context variables
```

### Rule 3: Unhandled Instruction Variants
If an instruction has lvalues that the pass does not handle, it throws a Todo error.

**Error (Todo):**
```
ValidateContextVariableLValues: unhandled instruction variant
Handle '[kind]' lvalues
```

## Algorithm

### Phase 1: Initialize Tracking
```typescript
const identifierKinds: Map<IdentifierId, {place: Place, kind: 'local' | 'context' | 'destructure'}> = new Map();
```

### Phase 2: Visit All Instructions
The pass iterates through all blocks and instructions, categorizing each based on its kind:

```typescript
for (const [, block] of fn.body.blocks) {
  for (const instr of block.instructions) {
    switch (value.kind) {
      case 'DeclareContext':
      case 'StoreContext':
        visit(identifierKinds, value.lvalue.place, 'context');
        break;
      case 'LoadContext':
        visit(identifierKinds, value.place, 'context');
        break;
      case 'StoreLocal':
      case 'DeclareLocal':
        visit(identifierKinds, value.lvalue.place, 'local');
        break;
      case 'LoadLocal':
        visit(identifierKinds, value.place, 'local');
        break;
      case 'PostfixUpdate':
      case 'PrefixUpdate':
        visit(identifierKinds, value.lvalue, 'local');
        break;
      case 'Destructure':
        for (const lvalue of eachPatternOperand(value.lvalue.pattern)) {
          visit(identifierKinds, lvalue, 'destructure');
        }
        break;
      case 'ObjectMethod':
      case 'FunctionExpression':
        // Recursively validate nested functions
        validateContextVariableLValuesImpl(value.loweredFunc.func, identifierKinds);
        break;
    }
  }
}
```

### Phase 3: Check Consistency
For each place visited, the `visit` function checks if the identifier was previously seen with a different kind:

```typescript
function visit(identifiers, place, kind) {
  const prev = identifiers.get(place.identifier.id);
  if (prev !== undefined) {
    const wasContext = prev.kind === 'context';
    const isContext = kind === 'context';
    if (wasContext !== isContext) {
      // Check for destructuring of context variable
      if (prev.kind === 'destructure' || kind === 'destructure') {
        CompilerError.throwTodo({
          reason: `Support destructuring of context variables`,
          ...
        });
      }
      // Invariant violation: inconsistent variable kinds
      CompilerError.invariant(false, {
        reason: 'Expected all references to be consistently local or context references',
        ...
      });
    }
  }
  identifiers.set(place.identifier.id, {place, kind});
}
```

## Edge Cases

### Nested Function Expressions
The validation recursively processes nested function expressions and object methods, sharing the same `identifierKinds` map. This ensures that a variable captured by a nested function is consistently treated as a context variable throughout the entire function hierarchy.

### Destructuring Patterns
Each operand in a destructure pattern is visited individually, marked as 'destructure' kind. If the same identifier was previously used as a context variable, a Todo error is thrown since destructuring of context variables is not yet supported.

### Update Expressions
Both `PostfixUpdate` (e.g., `x++`) and `PrefixUpdate` (e.g., `++x`) are treated as local variable operations.

## TODOs

1. **Destructuring of context variables** - Currently not supported:
   ```typescript
   CompilerError.throwTodo({
     reason: `Support destructuring of context variables`,
     ...
   });
   ```

2. **Unhandled instruction variants** - Some instruction types with lvalues may not be handled:
   ```typescript
   CompilerError.throwTodo({
     reason: 'ValidateContextVariableLValues: unhandled instruction variant',
     description: `Handle '${value.kind}' lvalues`,
     ...
   });
   ```

## Example

### Fixture: `error.todo-for-of-loop-with-context-variable-iterator.js`

**Input:**
```javascript
import {useHook} from 'shared-runtime';

function Component(props) {
  const data = useHook();
  const items = [];
  // NOTE: `item` is a context variable because it's reassigned and also referenced
  // within a closure, the `onClick` handler of each item
  for (let item of props.data) {
    item = item ?? {}; // reassignment to force a context variable
    items.push(
      <div key={item.id} onClick={() => data.set(item)}>
        {item.id}
      </div>
    );
  }
  return <div>{items}</div>;
}
```

**Error:**
```
Todo: Support non-trivial for..of inits

error.todo-for-of-loop-with-context-variable-iterator.ts:8:2
   6 |   // NOTE: `item` is a context variable because it's reassigned and also referenced
   7 |   // within a closure, the `onClick` handler of each item
>  8 |   for (let item of props.data) {
     |   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
>  9 |     item = item ?? {}; // reassignment to force a context variable
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
...
> 15 |   }
     | ^^^^ Support non-trivial for..of inits
```

Note: This particular error comes from an earlier pass (lowering), but demonstrates the kind of context variable scenarios that this validation is designed to catch.
