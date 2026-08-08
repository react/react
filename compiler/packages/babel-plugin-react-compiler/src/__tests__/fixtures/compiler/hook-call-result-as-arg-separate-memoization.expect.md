
## Input

```javascript
// Repro for https://github.com/facebook/react/issues/36848
// The result of cheapFunction() should be memoized independently from the
// call to expensiveFunction(intermediate), so that expensiveFunction is only
// re-called when the value of intermediate changes, not whenever cheapFunction's
// identity changes.
function useHook() {
  const expensiveFunction = useGetExpensiveFunction();
  const cheapFunction = useGetCheapFunction();

  const intermediate = cheapFunction();

  return expensiveFunction(intermediate);
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // Repro for https://github.com/facebook/react/issues/36848
// The result of cheapFunction() should be memoized independently from the
// call to expensiveFunction(intermediate), so that expensiveFunction is only
// re-called when the value of intermediate changes, not whenever cheapFunction's
// identity changes.
function useHook() {
  const $ = _c(5);
  const expensiveFunction = useGetExpensiveFunction();
  const cheapFunction = useGetCheapFunction();
  let intermediate;
  if ($[0] !== cheapFunction) {
    intermediate = cheapFunction();
    $[0] = cheapFunction;
    $[1] = intermediate;
  } else {
    intermediate = $[1];
  }
  let t0;
  if ($[2] !== expensiveFunction || $[3] !== intermediate) {
    t0 = expensiveFunction(intermediate);
    $[2] = expensiveFunction;
    $[3] = intermediate;
    $[4] = t0;
  } else {
    t0 = $[4];
  }
  return t0;
}

```
      
### Eval output
(kind: exception) Fixture not implemented