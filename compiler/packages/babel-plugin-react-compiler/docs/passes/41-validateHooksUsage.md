# validateHooksUsage

## File
`src/Validation/ValidateHooksUsage.ts`

## Purpose
This validation pass ensures that the function honors the [Rules of Hooks](https://react.dev/warnings/invalid-hook-call-warning). Specifically, it validates that:

1. Hooks may only be called unconditionally (not in if statements, loops, etc.)
2. Hooks cannot be used as first-class values (passed around, stored in variables, etc.)
3. Hooks must be the same function on every render (no dynamic hooks)
4. Hooks must be called at the top level, not within nested function expressions

## Input Invariants
- The function has been lowered to HIR
- Global bindings have been resolved and typed
- Nested function expressions have been lowered

## Value Kinds Lattice

The pass uses abstract interpretation with a lattice of value kinds:

```typescript
enum Kind {
  Error,        // Hook already used in an invalid way (stop reporting)
  KnownHook,    // Definitely a hook (from LoadGlobal with hook type)
  PotentialHook, // Might be a hook (hook-like name but not from global)
  Global,       // A global value that is not a hook
  Local,        // A local variable
}
```

The `joinKinds` function merges kinds, with earlier kinds taking precedence:
- `Error` > `KnownHook` > `PotentialHook` > `Global` > `Local`

## Validation Rules

### Rule 1: No Conditional Hook Calls
Hooks must always be called in a consistent order.

**Error:**
```
Error: Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)
```

### Rule 2: No Hooks as First-Class Values
Known hooks may not be referenced as normal values (only called).

**Error:**
```
Error: Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values
```

### Rule 3: No Dynamic Hooks
Potential hooks (hook-like names from local scope) may change between renders.

**Error:**
```
Error: Hooks must be the same function on every render, but this value may change over time to a different function. See https://react.dev/reference/rules/react-calls-components-and-hooks#dont-dynamically-use-hooks
```

### Rule 4: No Hooks in Nested Functions
Hooks must be called at the top level of a component or custom hook.

**Error:**
```
Error: Hooks must be called at the top level in the body of a function component or custom hook, and may not be called within function expressions. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

Cannot call [hookKind] within a function expression
```

## Algorithm

### Phase 1: Compute Unconditional Blocks
```typescript
const unconditionalBlocks = computeUnconditionalBlocks(fn);
```
Determines which blocks are guaranteed to execute on every render (not inside conditionals).

### Phase 2: Initialize Tracking
```typescript
const valueKinds = new Map<IdentifierId, Kind>();

// Initialize parameters
for (const param of fn.params) {
  const place = param.kind === 'Identifier' ? param : param.place;
  const kind = getKindForPlace(place); // PotentialHook if hook-like name
  setKind(place, kind);
}
```

### Phase 3: Track Value Kinds Through Instructions

For each instruction, the pass tracks how hook-ness flows through values:

```typescript
case 'LoadGlobal':
  // Globals are the source of KnownHook
  if (getHookKind(fn.env, instr.lvalue.identifier) != null) {
    setKind(instr.lvalue, Kind.KnownHook);
  } else {
    setKind(instr.lvalue, Kind.Global);
  }
  break;

case 'PropertyLoad':
  // Hook-like property of Global -> KnownHook
  // Hook-like property of Local -> PotentialHook
  // Property of KnownHook -> KnownHook (if hook-like name)
  const objectKind = getKindForPlace(value.object);
  const isHookProperty = isHookName(value.property);
  // Determine kind based on object kind and property name
  break;

case 'CallExpression':
  const calleeKind = getKindForPlace(value.callee);
  const isHookCallee = calleeKind === Kind.KnownHook || calleeKind === Kind.PotentialHook;

  if (isHookCallee && !unconditionalBlocks.has(block.id)) {
    recordConditionalHookError(value.callee);
  } else if (calleeKind === Kind.PotentialHook) {
    recordDynamicHookUsageError(value.callee);
  }
  break;
```

### Phase 4: Check for Invalid Hook References

When a `KnownHook` is used as an operand (not as a callee), it's an error:

```typescript
function visitPlace(place: Place): void {
  const kind = valueKinds.get(place.identifier.id);
  if (kind === Kind.KnownHook) {
    recordInvalidHookUsageError(place);
  }
}
```

### Phase 5: Validate Nested Function Expressions

Recursively check that nested functions don't call hooks:

```typescript
function visitFunctionExpression(errors: CompilerError, fn: HIRFunction) {
  for (const instr of allInstructions(fn)) {
    if (isCall(instr)) {
      const callee = getCallee(instr);
      const hookKind = getHookKind(fn.env, callee.identifier);
      if (hookKind != null) {
        errors.push({
          reason: 'Hooks must be called at the top level...',
          description: `Cannot call ${hookKind} within a function expression`,
        });
      }
    }
    // Recursively check nested functions
    if (isFunctionExpression(instr)) {
      visitFunctionExpression(errors, instr.value.loweredFunc.func);
    }
  }
}
```

### Phi Node Handling

For phi nodes (control flow join points), the pass joins the kinds of all operands:

```typescript
for (const phi of block.phis) {
  let kind = isHookName(phi.place.identifier.name) ? Kind.PotentialHook : Kind.Local;
  for (const [, operand] of phi.operands) {
    const operandKind = valueKinds.get(operand.identifier.id);
    if (operandKind !== undefined) {
      kind = joinKinds(kind, operandKind);
    }
  }
  valueKinds.set(phi.place.identifier.id, kind);
}
```

## Edge Cases

### Optional Calls
Optional calls like `useHook?.()` are treated as conditional:
```javascript
const result = useHook?.(); // Error: conditional hook call
```

### Property Access on Hooks
Hook-like properties of known hooks are also known hooks:
```javascript
const useFoo = useHook.useFoo; // useFoo is KnownHook
useFoo(); // Must be called unconditionally
```

### Destructuring from Global
Destructuring hook-like names from a global creates known hooks:
```javascript
const {useState} = React; // useState is KnownHook
```

### Hook-Like Names from Local Variables
Hook-like names from local variables are potential hooks:
```javascript
const obj = createObject();
const useFoo = obj.useFoo; // PotentialHook
useFoo(); // Error: dynamic hook
```

### Error Deduplication
The pass deduplicates errors by source location, and once an error is recorded for a place, it's marked as `Kind.Error` to prevent further errors for the same place.

## TODOs

1. **Fixpoint iteration for loops** - The pass currently skips phi operands whose value is unknown (which can occur in loops). A follow-up could expand this to fixpoint iteration:
   ```typescript
   // NOTE: we currently skip operands whose value is unknown
   // (which can only occur for functions with loops), we may
   // cause us to miss invalid code in some cases. We should
   // expand this to a fixpoint iteration in a follow-up.
   ```

## Example

### Fixture: `rules-of-hooks/error.invalid-hook-if-consequent.js`

**Input:**
```javascript
function Component(props) {
  let x = null;
  if (props.cond) {
    x = useHook();
  }
  return x;
}
```

**Error:**
```
Error: Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

error.invalid-hook-if-consequent.ts:4:8
  2 |   let x = null;
  3 |   if (props.cond) {
> 4 |     x = useHook();
    |         ^^^^^^^ Hooks must always be called in a consistent order...
  5 |   }
  6 |   return x;
```

### Fixture: `rules-of-hooks/error.invalid-hook-as-prop.js`

**Input:**
```javascript
function Component({useFoo}) {
  useFoo();
}
```

**Error:**
```
Error: Hooks must be the same function on every render, but this value may change over time to a different function. See https://react.dev/reference/rules/react-calls-components-and-hooks#dont-dynamically-use-hooks

error.invalid-hook-as-prop.ts:2:2
  1 | function Component({useFoo}) {
> 2 |   useFoo();
    |   ^^^^^^ Hooks must be the same function on every render...
  3 | }
```

### Fixture: `rules-of-hooks/error.invalid-hook-in-nested-function-expression-object-expression.js`

**Input:**
```javascript
function Component() {
  'use memo';
  const f = () => {
    const x = {
      outer() {
        const g = () => {
          const y = {
            inner() {
              return useFoo();
            },
          };
          return y;
        };
      },
    };
    return x;
  };
}
```

**Error:**
```
Error: Hooks must be called at the top level in the body of a function component or custom hook, and may not be called within function expressions. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

Cannot call hook within a function expression.

error.invalid-hook-in-nested-function-expression-object-expression.ts:10:21
   8 |           const y = {
   9 |             inner() {
> 10 |               return useFoo();
     |                      ^^^^^^ Hooks must be called at the top level...
  11 |             },
  12 |           };
```

### Fixture: `rules-of-hooks/error.invalid-hook-optionalcall.js`

**Input:**
```javascript
function Component() {
  const {result} = useConditionalHook?.() ?? {};
  return result;
}
```

**Error:**
```
Error: Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

error.invalid-hook-optionalcall.ts:2:19
  1 | function Component() {
> 2 |   const {result} = useConditionalHook?.() ?? {};
    |                    ^^^^^^^^^^^^^^^^^^ Hooks must always be called in a consistent order...
  3 |   return result;
```
