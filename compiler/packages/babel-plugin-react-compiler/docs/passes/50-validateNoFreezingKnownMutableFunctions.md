# validateNoFreezingKnownMutableFunctions

## File
`src/Validation/ValidateNoFreezingKnownMutableFunctions.ts`

## Purpose
This validation pass ensures that functions with known mutations (functions that mutate captured local variables) are not passed where a frozen value is expected. Frozen contexts include JSX props, hook arguments, and return values from hooks.

The key insight is that a function which mutates captured variables is effectively a mutable value itself. Unlike a mutable array (which a receiver can choose not to mutate), there is no way for the receiver of a function to prevent the mutation from happening when the function is called. Therefore, passing such functions to props or hooks violates React's expectation that rendered values are immutable.

## Input Invariants
- The function has been through aliasing effect inference
- `aliasingEffects` on FunctionExpression values have been computed
- `Mutate` and `MutateTransitive` effects identify definite mutations to captured variables

## Validation Rules
The pass produces errors when:

1. **Mutable function passed as JSX prop**: A function that mutates a captured variable is passed as a prop to a JSX element
2. **Mutable function passed to hook**: A function that mutates a captured variable is passed as an argument to a hook
3. **Mutable function returned from hook**: A function that mutates a captured variable is returned from a hook

**Exception - Ref mutations**: Functions that mutate refs (`isRefOrRefLikeMutableType`) are allowed, since refs are mutable by design and not tracked for rendering purposes.

Error messages produced:
- Category: `Immutability`
- Reason: "Cannot modify local variables after render completes"
- Description: "This argument is a function which may reassign or mutate [variable] after render, which can cause inconsistent behavior on subsequent renders. Consider using state instead"
- Messages:
  - "This function may (indirectly) reassign or modify [variable] after render"
  - "This modifies [variable]"

## Algorithm

### Phase 1: Track Context Mutation Effects
The pass maintains a map from identifier IDs to their associated mutation effects:

```typescript
const contextMutationEffects: Map<
  IdentifierId,
  Extract<AliasingEffect, {kind: 'Mutate'} | {kind: 'MutateTransitive'}>
> = new Map();
```

### Phase 2: Single Forward Pass
Process all blocks in order, handling specific instruction types:

```typescript
for (const block of fn.body.blocks.values()) {
  for (const instr of block.instructions) {
    switch (value.kind) {
      case 'LoadLocal': {
        // Propagate mutation effect from source to loaded value
        const effect = contextMutationEffects.get(value.place.identifier.id);
        if (effect != null) {
          contextMutationEffects.set(lvalue.identifier.id, effect);
        }
        break;
      }
      case 'StoreLocal': {
        // Propagate mutation effect to both lvalue and stored variable
        const effect = contextMutationEffects.get(value.value.identifier.id);
        if (effect != null) {
          contextMutationEffects.set(lvalue.identifier.id, effect);
          contextMutationEffects.set(value.lvalue.place.identifier.id, effect);
        }
        break;
      }
      case 'FunctionExpression': {
        // Check function's aliasing effects for context mutations
        if (value.loweredFunc.func.aliasingEffects != null) {
          const context = new Set(
            value.loweredFunc.func.context.map(p => p.identifier.id)
          );
          for (const effect of value.loweredFunc.func.aliasingEffects) {
            if (effect.kind === 'Mutate' || effect.kind === 'MutateTransitive') {
              // Mark function as mutable if it mutates a context variable
              if (context.has(effect.value.identifier.id) &&
                  !isRefOrRefLikeMutableType(effect.value.identifier.type)) {
                contextMutationEffects.set(lvalue.identifier.id, effect);
              }
            }
          }
        }
        break;
      }
      default: {
        // Check all operands for freeze effect violations
        for (const operand of eachInstructionValueOperand(value)) {
          visitOperand(operand);  // Check if mutable function is being frozen
        }
      }
    }
  }
}
```

### Phase 3: Validate Freeze Effects
When an operand has a `Freeze` effect, check if it's a known mutable function:

```typescript
function visitOperand(operand: Place): void {
  if (operand.effect === Effect.Freeze) {
    const effect = contextMutationEffects.get(operand.identifier.id);
    if (effect != null) {
      // Emit error with both usage location and mutation location
      errors.pushDiagnostic(
        CompilerDiagnostic.create({
          category: ErrorCategory.Immutability,
          reason: 'Cannot modify local variables after render completes',
          description: `This argument is a function which may reassign or mutate ${variable} after render...`,
        })
        .withDetails({loc: operand.loc, message: 'This function may...'})
        .withDetails({loc: effect.value.loc, message: 'This modifies...'})
      );
    }
  }
}
```

## Edge Cases

### Function Passed as JSX Prop (Error)
```javascript
function Component() {
  const cache = new Map();
  const fn = () => {
    cache.set('key', 'value');  // Mutates captured variable
  };
  return <Foo fn={fn} />;  // Error: fn is frozen but mutates cache
}
```

### Function Passed to Hook (Error)
```javascript
function useFoo() {
  const cache = new Map();
  useHook(() => {
    cache.set('key', 'value');  // Error: function mutates cache
  });
}
```

### Function Returned from Hook (Error)
```javascript
function useFoo() {
  useHook();  // For hook inference
  const cache = new Map();
  return () => {
    cache.set('key', 'value');  // Error: returned function mutates cache
  };
}
```

### Ref Mutation (Allowed)
```javascript
function Component() {
  const ref = useRef(null);
  const fn = () => {
    ref.current = value;  // OK: refs are mutable by design
  };
  return <Foo fn={fn} />;  // Allowed
}
```

### Conditional Mutations
The pass only errors on definite mutations (`Mutate`, `MutateTransitive`), not conditional mutations (`MutateConditionally`, `MutateTransitiveConditionally`). However, if a function already has a known mutation effect, conditional mutations will propagate that effect:

```javascript
function Component(cond) {
  const cache = new Map();
  const fn = () => {
    cache.set('a', 1);  // Definite mutation
  };
  const fn2 = fn;  // fn2 inherits mutation effect
  return <Foo fn={fn2} />;  // Error
}
```

### Nested Function Expressions
Mutation effects propagate through assignments:

```javascript
function Component() {
  const cache = new Map();
  const inner = () => cache.set('key', 'value');
  const outer = inner;  // outer inherits mutation effect
  return <Foo fn={outer} />;  // Error
}
```

## TODOs
None in the source file.

## Example

### Fixture: `error.invalid-pass-mutable-function-as-prop.js`

**Input:**
```javascript
// @validateNoFreezingKnownMutableFunctions
function Component() {
  const cache = new Map();
  const fn = () => {
    cache.set('key', 'value');
  };
  return <Foo fn={fn} />;
}
```

**Error:**
```
Found 1 error:

Error: Cannot modify local variables after render completes

This argument is a function which may reassign or mutate `cache` after render, which can cause inconsistent behavior on subsequent renders. Consider using state instead.

error.invalid-pass-mutable-function-as-prop.ts:7:18
  5 |     cache.set('key', 'value');
  6 |   };
> 7 |   return <Foo fn={fn} />;
    |                   ^^ This function may (indirectly) reassign or modify `cache` after render
  8 | }
  9 |

error.invalid-pass-mutable-function-as-prop.ts:5:4
  3 |   const cache = new Map();
  4 |   const fn = () => {
> 5 |     cache.set('key', 'value');
    |     ^^^^^ This modifies `cache`
  6 |   };
  7 |   return <Foo fn={fn} />;
  8 | }
```

### Fixture: `error.invalid-hook-function-argument-mutates-local-variable.js`

**Input:**
```javascript
// @validateNoFreezingKnownMutableFunctions

function useFoo() {
  const cache = new Map();
  useHook(() => {
    cache.set('key', 'value');
  });
}
```

**Error:**
```
Found 1 error:

Error: Cannot modify local variables after render completes

This argument is a function which may reassign or mutate `cache` after render, which can cause inconsistent behavior on subsequent renders. Consider using state instead.

error.invalid-hook-function-argument-mutates-local-variable.ts:5:10
  3 | function useFoo() {
  4 |   const cache = new Map();
> 5 |   useHook(() => {
    |           ^^^^^^^
> 6 |     cache.set('key', 'value');
    | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 7 |   });
    | ^^^^ This function may (indirectly) reassign or modify `cache` after render
  8 | }
  9 |

error.invalid-hook-function-argument-mutates-local-variable.ts:6:4
  4 |   const cache = new Map();
  5 |   useHook(() => {
> 6 |     cache.set('key', 'value');
    |     ^^^^^ This modifies `cache`
  7 |   });
  8 | }
  9 |
```

Key observations:
- The pass detects functions that mutate captured local variables (not refs)
- Errors show both where the function is used (frozen) and where the mutation occurs
- The validation prevents inconsistent re-render behavior by catching mutations that happen after render
- The suggestion to "use state instead" guides users toward the correct React pattern
