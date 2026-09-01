# codegenReactiveFunction

## File
`src/ReactiveScopes/CodegenReactiveFunction.ts`

## Purpose
This is the final pass that converts the ReactiveFunction representation back into a Babel AST. It generates the memoization code that makes React components and hooks efficient by:
1. Creating the `useMemoCache` call to allocate cache slots
2. Generating dependency comparisons to check if values have changed
3. Emitting conditional blocks that skip computation when cached values are valid
4. Storing computed values in the cache
5. Loading cached values when dependencies haven't changed

## Input Invariants
- The ReactiveFunction has been through all prior passes
- All identifiers that need names have been promoted and renamed
- Reactive scopes have finalized `dependencies`, `declarations`, and `reassignments`
- Early returns have been transformed with sentinel values (via `propagateEarlyReturns`)
- Pruned scopes are marked with `kind: 'pruned-scope'`
- Unique identifiers set is available to avoid naming conflicts

## Output Guarantees
- Returns a `CodegenFunction` with Babel AST `body`
- All reactive scopes become if-else blocks checking dependencies
- The `$` cache array is properly sized with `useMemoCache(n)`
- Each dependency and output gets its own cache slot
- Pruned scopes emit their instructions inline without memoization
- Early returns use the sentinel pattern with post-scope checks
- Statistics are collected: `memoSlotsUsed`, `memoBlocks`, `memoValues`, etc.

## Algorithm

### Entry Point: codegenFunction
```typescript
export function codegenFunction(fn: ReactiveFunction): Result<CodegenFunction, CompilerError> {
  const cx = new Context(...);

  // Optional: Fast Refresh source hash tracking
  if (enableResetCacheOnSourceFileChanges) {
    fastRefreshState = { cacheIndex: cx.nextCacheIndex, hash: sha256(source) };
  }

  const compiled = codegenReactiveFunction(cx, fn);

  // Prepend useMemoCache call if any cache slots used
  if (cacheCount !== 0) {
    body.unshift(
      t.variableDeclaration('const', [
        t.variableDeclarator(
          t.identifier('$'),
          t.callExpression(t.identifier('useMemoCache'), [t.numericLiteral(cacheCount)])
        )
      ])
    );
  }

  return compiled;
}
```

### Context Class
Tracks state during codegen:
```typescript
class Context {
  #nextCacheIndex: number = 0;  // Allocates cache slots
  #declarations: Set<DeclarationId> = new Set();  // Tracks declared variables
  temp: Temporaries;  // Maps identifiers to their expressions
  errors: CompilerError;

  get nextCacheIndex(): number {
    return this.#nextCacheIndex++;  // Returns and increments
  }
}
```

### codegenReactiveScope
The core of memoization code generation:

```typescript
function codegenReactiveScope(cx: Context, statements: Array<t.Statement>,
                              scope: ReactiveScope, block: ReactiveBlock): void {
  const changeExpressions: Array<t.Expression> = [];
  const cacheStoreStatements: Array<t.Statement> = [];
  const cacheLoadStatements: Array<t.Statement> = [];

  // 1. Generate dependency checks
  for (const dep of scope.dependencies) {
    const index = cx.nextCacheIndex;
    changeExpressions.push(
      t.binaryExpression('!==',
        t.memberExpression(t.identifier('$'), t.numericLiteral(index), true),
        codegenDependency(cx, dep)
      )
    );
    cacheStoreStatements.push(
      t.assignmentExpression('=', $[index], dep)
    );
  }

  // 2. Generate output cache slots
  for (const {identifier} of scope.declarations) {
    const index = cx.nextCacheIndex;
    // Declare variable if not already declared
    if (!cx.hasDeclared(identifier)) {
      statements.push(t.variableDeclaration('let', [t.variableDeclarator(name, null)]));
    }
    cacheLoads.push({name, index, value: name});
  }

  // 3. Build test condition
  let testCondition = changeExpressions.reduce((acc, expr) =>
    t.logicalExpression('||', acc, expr)
  );

  // 4. If no dependencies, use sentinel check
  if (testCondition === null) {
    testCondition = t.binaryExpression('===',
      $[firstOutputIndex],
      t.callExpression(Symbol.for, ['react.memo_cache_sentinel'])
    );
  }

  // 5. Generate the memoization if-else
  statements.push(
    t.ifStatement(
      testCondition,
      computationBlock,  // Compute + store in cache
      cacheLoadBlock     // Load from cache
    )
  );
}
```

### Generated Structure
For a scope with dependencies `[a, b]` and output `result`:

```javascript
let result;
if ($[0] !== a || $[1] !== b) {
  // Computation block
  result = compute(a, b);

  // Store dependencies
  $[0] = a;
  $[1] = b;

  // Store output
  $[2] = result;
} else {
  // Load from cache
  result = $[2];
}
```

### Early Return Handling
When a scope has an early return (from `propagateEarlyReturns`):

```typescript
// Before scope: initialize sentinel
t0 = Symbol.for("react.early_return_sentinel");

// Scope generates labeled block
bb0: {
  // ... computation ...
  if (cond) {
    t0 = returnValue;
    break bb0;
  }
}

// After scope: check for early return
if (t0 !== Symbol.for("react.early_return_sentinel")) {
  return t0;
}
```

### Pruned Scopes
Pruned scopes emit their instructions inline without memoization:
```typescript
case 'pruned-scope': {
  const scopeBlock = codegenBlockNoReset(cx, item.instructions);
  statements.push(...scopeBlock.body);  // Inline, no memoization
  break;
}
```

## Edge Cases

### Zero Dependencies
Scopes with no dependencies use a sentinel value check instead:
```javascript
if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
  // First render only
}
```

### Fast Refresh / HMR
When `enableResetCacheOnSourceFileChanges` is enabled, the generated code includes a source hash check that resets the cache when the source changes:
```javascript
if ($[0] !== "source_hash_abc123") {
  for (let $i = 0; $i < cacheCount; $i++) {
    $[$i] = Symbol.for("react.memo_cache_sentinel");
  }
  $[0] = "source_hash_abc123";
}
```


### Labeled Breaks
Control flow with labeled breaks (for early returns or loop exits) uses `codegenLabel` to generate consistent label names:
```typescript
function codegenLabel(id: BlockId): string {
  return `bb${id}`;  // e.g., "bb0", "bb1"
}
```

### Nested Functions
Function expressions and object methods are recursively processed with their own contexts.

### FBT/Internationalization
Special handling for FBT operands ensures they're memoized in the same scope for correct internationalization behavior.

## Statistics Collected
```typescript
type CodegenFunction = {
  memoSlotsUsed: number;     // Total cache slots allocated
  memoBlocks: number;        // Number of reactive scopes
  memoValues: number;        // Total memoized values
  prunedMemoBlocks: number;  // Scopes that were pruned
  prunedMemoValues: number;  // Values in pruned scopes
  hasInferredEffect: boolean;
};
```

## TODOs
None in the source file.

## Example

### Fixture: `simple.js`

**Input:**
```javascript
export default function foo(x, y) {
  if (x) {
    return foo(false, y);
  }
  return [y * 10];
}
```

**Generated Code:**
```javascript
import { c as _c } from "react/compiler-runtime";
export default function foo(x, y) {
  const $ = _c(4);  // Allocate 4 cache slots
  if (x) {
    let t0;
    if ($[0] !== y) {           // Check dependency
      t0 = foo(false, y);       // Compute
      $[0] = y;                 // Store dependency
      $[1] = t0;                // Store output
    } else {
      t0 = $[1];                // Load from cache
    }
    return t0;
  }
  const t0 = y * 10;
  let t1;
  if ($[2] !== t0) {            // Check dependency
    t1 = [t0];                  // Compute
    $[2] = t0;                  // Store dependency
    $[3] = t1;                  // Store output
  } else {
    t1 = $[3];                  // Load from cache
  }
  return t1;
}
```

Key observations:
- `_c(4)` allocates 4 cache slots total
- First scope uses slots 0-1: slot 0 for `y` dependency, slot 1 for `t0` output
- Second scope uses slots 2-3: slot 2 for `t0` (the computed `y * 10`), slot 3 for `t1` (the array)
- Each scope has an if-else structure: compute/store vs load
- The memoization ensures referential equality of the returned array when `y` hasn't changed
