# propagateEarlyReturns

## File
`src/ReactiveScopes/PropagateEarlyReturns.ts`

## Purpose
The `propagateEarlyReturns` pass ensures that reactive scopes (memoization blocks) correctly honor the control flow behavior of the original code, particularly when a function returns early from within a reactive scope. Without this transformation, if a component returned early on the previous render and the inputs have not changed, the cached memoization block would be skipped entirely, but the early return would not occur, causing incorrect behavior.

The pass solves this by transforming `return` statements inside reactive scopes into assignments to a temporary variable followed by a labeled `break`. After the reactive scope completes, generated code checks whether the early return sentinel value was replaced with an actual return value; if so, the function returns that value.

## Input Invariants
1. **ReactiveFunction structure**: The input must be a `ReactiveFunction` with scopes already inferred (reactive scope blocks are already established)
2. **Scope earlyReturnValue not set**: The pass expects `scopeBlock.scope.earlyReturnValue === null` for scopes it processes
3. **Return statements within reactive scopes**: The pass specifically targets `return` terminal statements that appear within a `withinReactiveScope` context

## Output Guarantees
1. **Labeled scope blocks**: Top-level reactive scopes containing early returns are wrapped in a labeled block (e.g., `bb14: { ... }`)
2. **Sentinel initialization**: At the start of each such scope, a temporary variable is initialized to `Symbol.for("react.early_return_sentinel")`
3. **Return-to-break transformation**: All `return` statements inside the scope are replaced with:
   - An assignment of the return value to the early return temporary
   - A `break` to the scope's label
4. **Early return declaration**: The temporary variable is registered as a declaration of the scope so it gets memoized
5. **Post-scope check**: During codegen, an if-statement is added after the scope to check if the temporary differs from the sentinel and return it if so

## Algorithm

The pass uses a visitor pattern with a `ReactiveFunctionTransform` that tracks two pieces of state:

```typescript
type State = {
  withinReactiveScope: boolean;  // Are we inside a reactive scope?
  earlyReturnValue: ReactiveScope['earlyReturnValue'];  // Bubble up early return info
};
```

### Key Steps:

1. **visitScope** - When entering a reactive scope:
   - Create an inner state with `withinReactiveScope: true`
   - Traverse the scope's contents
   - If any early returns were found (`earlyReturnValue !== null`):
     - If this is the **outermost** scope (parent's `withinReactiveScope` is false):
       - Store the early return info on the scope
       - Add the temporary as a scope declaration
       - Prepend sentinel initialization instructions
       - Wrap the original instructions in a labeled block
     - Otherwise, propagate the early return info to the parent scope

2. **transformTerminal** - When encountering a `return` inside a reactive scope:
   - Create or reuse an early return value identifier
   - Replace the return with:
     ```typescript
     [
       {kind: 'instruction', /* StoreLocal: reassign earlyReturnValue = returnValue */},
       {kind: 'terminal', /* break to earlyReturnValue.label */}
     ]
     ```

### Sentinel Initialization Code (synthesized at scope start):
```typescript
// Load Symbol.for and call it with the sentinel string
let t0 = Symbol.for("react.early_return_sentinel");
```

## Edge Cases

### Nested Reactive Scopes
When early returns occur in nested scopes, only the **outermost** scope gets the labeled block wrapper. Inner scopes bubble their early return information up via `parentState.earlyReturnValue`.

### Multiple Early Returns in Same Scope
All returns share the same temporary variable and label. The first return found creates the identifier, subsequent returns reuse it.

### Partial Early Returns
When only some control flow paths return early (e.g., one branch returns, the other falls through), the sentinel check after the scope allows normal execution to continue if no early return occurred.

### Already Processed Scopes
If `scopeBlock.scope.earlyReturnValue !== null` on entry, the pass exits early without modification.

### Returns Outside Reactive Scopes
The pass only transforms returns where `state.withinReactiveScope === true`. Returns outside scopes are left unchanged.

## TODOs
None in the source file.

## Example

### Fixture: `early-return-within-reactive-scope.js`

**Input:**
```javascript
function Component(props) {
  let x = [];
  if (props.cond) {
    x.push(props.a);
    return x;
  } else {
    return makeArray(props.b);
  }
}
```

**After PropagateEarlyReturns** (from `yarn snap -p early-return-within-reactive-scope.js -d`):
```
scope @0 [...] earlyReturn={id: #t34$34, label: 14} {
  [0] $36 = LoadGlobal(global) Symbol
  [0] $37 = PropertyLoad $36.for
  [0] $38 = "react.early_return_sentinel"
  [0] $35 = MethodCall $36.$37($38)
  [0] StoreLocal Let #t34$34{reactive} = $35    // Initialize sentinel
  bb14: {
    [2] $19_@0 = Array []
    [3] StoreLocal Const x$20_@0 = $19_@0
    [4] $22{reactive} = LoadLocal props$18
    [5] $23{reactive} = PropertyLoad $22.cond
    [6] if ($23) {
      [7] $24_@0 = LoadLocal x$20_@0
      [8] $25 = PropertyLoad $24_@0.push
      [9] $26 = LoadLocal props$18
      [10] $27 = PropertyLoad $26.a
      [11] $28 = MethodCall $24_@0.$25($27)
      [12] $29 = LoadLocal x$20_@0
      [0] StoreLocal Reassign #t34$34 = $29     // was: return x
      [0] break bb14 (labeled)
    } else {
      [14] $30 = LoadGlobal import { makeArray }
      [15] $31 = LoadLocal props$18
      [16] $32 = PropertyLoad $31.b
      scope @1 [...] {
        [18] $33_@1 = Call $30($32)
      }
      [0] StoreLocal Reassign #t34$34 = $33_@1  // was: return makeArray(props.b)
      [0] break bb14 (labeled)
    }
  }
}
```

Key observations:
- Scope @0 now has `earlyReturn={id: #t34$34, label: 14}`
- Sentinel initialization code is prepended to the scope
- The scope body is wrapped in `bb14: { ... }`
- Both `return x` and `return makeArray(props.b)` are transformed to `StoreLocal Reassign + break bb14`

**Generated Code:**
```javascript
function Component(props) {
  const $ = _c(6);
  let t0;
  if ($[0] !== props.a || $[1] !== props.b || $[2] !== props.cond) {
    t0 = Symbol.for("react.early_return_sentinel");
    bb0: {
      const x = [];
      if (props.cond) {
        x.push(props.a);
        t0 = x;
        break bb0;
      } else {
        let t1;
        if ($[4] !== props.b) {
          t1 = makeArray(props.b);
          $[4] = props.b;
          $[5] = t1;
        } else {
          t1 = $[5];
        }
        t0 = t1;
        break bb0;
      }
    }
    $[0] = props.a;
    $[1] = props.b;
    $[2] = props.cond;
    $[3] = t0;
  } else {
    t0 = $[3];
  }
  if (t0 !== Symbol.for("react.early_return_sentinel")) {
    return t0;
  }
}
```

This transformation ensures that when inputs don't change, the cached return value is used and returned, preserving referential equality and correct early return behavior.
