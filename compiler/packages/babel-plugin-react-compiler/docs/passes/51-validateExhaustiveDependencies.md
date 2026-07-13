# validateExhaustiveDependencies

## File
`src/Validation/ValidateExhaustiveDependencies.ts`

## Purpose
This validation pass ensures that manual memoization (useMemo, useCallback) and effect hooks (useEffect, useLayoutEffect) have correct dependency arrays. The pass compares developer-specified dependencies against the actual values referenced within the memoized function or effect callback to detect:

1. **Missing dependencies**: Values used in the function that are not listed in the dependency array, causing the memoized value or effect to update less frequently than expected
2. **Extra dependencies**: Values listed in the dependency array that are not actually used, causing unnecessary re-computation or effect re-runs
3. **Overly precise dependencies**: Dependencies that access deeper property paths than what is actually used (e.g., `x.y.z` when only `x.y` is accessed)

The goal is to ensure that auto-memoization by the compiler will not substantially change program behavior.

## Input Invariants
- The function has been through `StartMemoize` and `FinishMemoize` instruction insertion
- Manual dependency arrays have been parsed and associated with memoization blocks
- Reactive identifiers have been computed
- Optional chaining paths have been analyzed

## Validation Rules
The pass produces errors for:

1. **Missing dependency in useMemo/useCallback**: A reactive value is used but not listed in deps
2. **Extra dependency in useMemo/useCallback**: A value is listed but not used
3. **Missing dependency in useEffect**: A value used in the effect callback is not in the deps array
4. **Extra dependency in useEffect**: A value in deps is not used in the callback
5. **Overly precise dependency**: The manual dep accesses a deeper path than what's actually used
6. **Global as dependency**: Module-level values should not be listed as dependencies
7. **useEffectEvent in dependency array**: Functions from useEffectEvent must not be in deps

**Exception - Optional dependencies**: Non-reactive values of stable types (refs, setState) or primitive types are optional and don't need to be listed.

Error messages produced:
- Categories: `MemoDependencies` or `EffectExhaustiveDependencies`
- Reasons:
  - "Found missing memoization dependencies"
  - "Found extra memoization dependencies"
  - "Found missing/extra memoization dependencies"
  - "Found missing effect dependencies"
  - "Found extra effect dependencies"
  - "Found missing/extra effect dependencies"
- Messages:
  - "Missing dependency `{dep}`"
  - "Unnecessary dependency `{dep}`"
  - "Overly precise dependency `{manual}`, use `{inferred}` instead"
  - "Functions returned from `useEffectEvent` must not be included in the dependency array"
  - "Values declared outside of a component/hook should not be listed as dependencies"

## Algorithm

### Phase 1: Collect Reactive Identifiers
Scan all instructions to identify which identifiers are reactive:

```typescript
function collectReactiveIdentifiersHIR(fn: HIRFunction): Set<IdentifierId> {
  const reactive = new Set<IdentifierId>();
  for (const block of fn.body.blocks.values()) {
    for (const instr of block.instructions) {
      for (const lvalue of eachInstructionLValue(instr)) {
        if (lvalue.reactive) {
          reactive.add(lvalue.identifier.id);
        }
      }
      // ... also check operands
    }
  }
  return reactive;
}
```

### Phase 2: Find Optional Places
Identify places that are within optional chaining expressions:

```typescript
function findOptionalPlaces(fn: HIRFunction): Map<IdentifierId, boolean> {
  // Walks through optional terminals to track which identifiers
  // are accessed via optional chaining (?.property)
}
```

### Phase 3: Collect Dependencies
The core algorithm processes each block, tracking:
- `temporaries`: Map of identifier IDs to their dependency information
- `locals`: Set of identifiers declared within the current scope
- `dependencies`: Set of inferred dependencies

```typescript
function collectDependencies(
  fn: HIRFunction,
  temporaries: Map<IdentifierId, Temporary>,
  callbacks: {
    onStartMemoize: (...) => void;
    onFinishMemoize: (...) => void;
    onEffect: (...) => void;
  },
  isFunctionExpression: boolean,
): Temporary {
  for (const block of fn.body.blocks.values()) {
    // Process phi nodes - merge dependencies from control flow
    for (const phi of block.phis) {
      // Aggregate dependencies from all operands
    }

    for (const instr of block.instructions) {
      switch (value.kind) {
        case 'LoadLocal':
        case 'LoadContext':
          // Track dependency path through the temporary
          break;
        case 'PropertyLoad':
          // Extend dependency path: x -> x.y
          break;
        case 'FunctionExpression':
          // Recursively collect dependencies from nested function
          break;
        case 'StartMemoize':
          // Begin tracking dependencies for this memo block
          break;
        case 'FinishMemoize':
          // Validate collected dependencies against manual deps
          break;
        case 'CallExpression':
        case 'MethodCall':
          // Check for effect hooks and validate their deps
          break;
      }
    }
  }
}
```

### Phase 4: Validate Dependencies
Compare inferred dependencies against manual dependencies:

```typescript
function validateDependencies(
  inferred: Array<InferredDependency>,
  manualDependencies: Array<ManualMemoDependency>,
  reactive: Set<IdentifierId>,
  ...
): CompilerDiagnostic | null {
  // Sort and deduplicate inferred dependencies
  // For each inferred dep, check if there's a matching manual dep
  // For each manual dep, check if it corresponds to an inferred dep
  // Report missing and extra dependencies
}
```

### Dependency Matching Rules
- If `x.y.z` is inferred, `x`, `x.y`, or `x.y.z` are valid manual deps
- Optional chaining is handled: `x?.y` inferred can match `x.y` manual (ignoring optionals)
- Stable types (refs, setState) that are non-reactive are optional
- Global values should not be in dependency arrays
- useEffectEvent return values should not be in dependency arrays

## Edge Cases

### Overly Precise Dependency (Error)
```javascript
const a = useMemo(() => {
  return x?.y.z?.a;
}, [x?.y.z?.a.b]);  // Error: should be [x?.y.z?.a]
```

### Unnecessary Dependencies (Error)
```javascript
const f = useMemo(() => {
  return [];
}, [x, y.z, GLOBAL]);  // Error: all deps are unnecessary
```

### Reactive Stable Type (Error)
```javascript
const ref1 = useRef(null);
const ref2 = useRef(null);
const ref = z ? ref1 : ref2;  // ref is reactive (depends on z)
const cb = useMemo(() => {
  return () => ref.current;
}, []);  // Error: missing dep 'ref' (reactive even though stable type)
```

### useEffectEvent in Dependencies (Error)
```javascript
const effectEvent = useEffectEvent(() => log(x));
useEffect(() => {
  effectEvent();
}, [effectEvent]);  // Error: useEffectEvent returns should not be in deps
```

### Effect with Missing and Extra Dependencies (Error)
```javascript
useEffect(() => {
  log(x, z);
}, [x, y]);  // Error: missing z, extra y
```

### Valid Dependency Specifications
```javascript
// All valid - deps cover or exceed what's used
const b = useMemo(() => x.y.z?.a, [x.y.z.a]);  // OK
const d = useMemo(() => x?.y?.[(console.log(y), z?.b)], [x?.y, y, z?.b]);  // OK
const e = useMemo(() => { e.push(x); return e; }, [x]);  // OK
```

## Configuration
The validation can be configured via compiler options:

```typescript
// For useMemo/useCallback
validateExhaustiveMemoizationDependencies: boolean

// For useEffect and similar
validateExhaustiveEffectDependencies: 'off' | 'all' | 'missing-only' | 'extra-only'
```

The `missing-only` and `extra-only` modes allow validating only one category of errors.

## TODOs
From the source file:

```typescript
/**
 * TODO: Invalid, Complex Deps
 *
 * Handle cases where the user deps were not simple identifiers + property chains.
 * We try to detect this in ValidateUseMemo but we miss some cases. The problem
 * is that invalid forms can be value blocks or function calls that don't get
 * removed by DCE, leaving a structure like:
 *
 * StartMemoize
 * t0 = <value to memoize>
 * ...non-DCE'd code for manual deps...
 * FinishMemoize decl=t0
 */
```

## Example

### Fixture: `error.invalid-exhaustive-deps.js`

**Input:**
```javascript
// @validateExhaustiveMemoizationDependencies @validateRefAccessDuringRender:false
import {useMemo} from 'react';

function Component({x, y, z}) {
  const a = useMemo(() => {
    return x?.y.z?.a;
    // error: too precise
  }, [x?.y.z?.a.b]);
  const f = useMemo(() => {
    return [];
    // error: unnecessary
  }, [x, y.z, z?.y?.a, UNUSED_GLOBAL]);
  const ref1 = useRef(null);
  const ref2 = useRef(null);
  const ref = z ? ref1 : ref2;
  const cb = useMemo(() => {
    return () => ref.current;
    // error: ref is a stable type but reactive
  }, []);
  return <Stringify results={[a, f, cb]} />;
}
```

**Error:**
```
Found 4 errors:

Error: Found missing/extra memoization dependencies

Missing dependencies can cause a value to update less often than it should, resulting in stale UI. Extra dependencies can cause a value to update more often than it should, resulting in performance problems such as excessive renders or effects firing too often.

error.invalid-exhaustive-deps.ts:7:11
  5 | function Component({x, y, z}) {
  6 |   const a = useMemo(() => {
> 7 |     return x?.y.z?.a;
    |            ^^^^^^^^^ Missing dependency `x?.y.z?.a`
  8 |     // error: too precise
  9 |   }, [x?.y.z?.a.b]);

error.invalid-exhaustive-deps.ts:9:6
> 9 |   }, [x?.y.z?.a.b]);
    |       ^^^^^^^^^^^ Overly precise dependency `x?.y.z?.a.b`, use `x?.y.z?.a` instead

Inferred dependencies: `[x?.y.z?.a]`

Error: Found extra memoization dependencies
...
error.invalid-exhaustive-deps.ts:31:6
> 31 |   }, [x, y.z, z?.y?.a, UNUSED_GLOBAL]);
     |       ^ Unnecessary dependency `x`
...
     |                        ^^^^^^^^^^^^^ Unnecessary dependency `UNUSED_GLOBAL`. Values declared outside of a component/hook should not be listed as dependencies as the component will not re-render if they change

Inferred dependencies: `[]`

Error: Found missing memoization dependencies
...
error.invalid-exhaustive-deps.ts:37:13
> 37 |       return ref.current;
     |              ^^^ Missing dependency `ref`. Refs, setState functions, and other "stable" values generally do not need to be added as dependencies, but this variable may change over time to point to different values

Inferred dependencies: `[ref]`
```

### Fixture: `error.invalid-exhaustive-effect-deps.js`

**Input:**
```javascript
// @validateExhaustiveEffectDependencies:"all"
import {useEffect} from 'react';

function Component({x, y, z}) {
  // error: missing dep - x
  useEffect(() => {
    log(x);
  }, []);

  // error: extra dep - y
  useEffect(() => {
    log(x);
  }, [x, y]);

  // error: missing dep - z; extra dep - y
  useEffect(() => {
    log(x, z);
  }, [x, y]);
}
```

**Error:**
```
Found 4 errors:

Error: Found missing effect dependencies

Missing dependencies can cause an effect to fire less often than it should.

error.invalid-exhaustive-effect-deps.ts:7:8
> 7 |     log(x);
    |         ^ Missing dependency `x`

Inferred dependencies: `[x]`

Error: Found extra effect dependencies

Extra dependencies can cause an effect to fire more often than it should, resulting in performance problems such as excessive renders and side effects.

error.invalid-exhaustive-effect-deps.ts:13:9
> 13 |   }, [x, y]);
     |          ^ Unnecessary dependency `y`

Inferred dependencies: `[x]`

Error: Found missing/extra effect dependencies
...
error.invalid-exhaustive-effect-deps.ts:17:11
> 17 |     log(x, z);
     |            ^ Missing dependency `z`

error.invalid-exhaustive-effect-deps.ts:18:9
> 18 |   }, [x, y]);
     |          ^ Unnecessary dependency `y`

Inferred dependencies: `[x, z]`
```

Key observations:
- The pass validates both useMemo/useCallback and useEffect dependency arrays
- Dependencies are inferred by analyzing actual value usage within the function
- Optional chaining paths are tracked and included in dependency paths
- Reactive stable types (like conditionally assigned refs) must still be listed
- Globals and useEffectEvent returns should not be in dependency arrays
- The validation provides fix suggestions showing the inferred correct dependencies
