
## Input

```javascript
// @enableOptimisticBuiltinMethodShapes

/**
 * Negative case: even with @enableOptimisticBuiltinMethodShapes enabled, a
 * method whose name is NOT a known non-mutating builtin collection method
 * (here a custom `.process(...)`) must be handled conservatively. The unknown
 * receiver keeps no shape, so the call may mutate it and `expensiveProcessing`
 * stays merged into a scope keyed on both `data` and `onClick` -- identical to
 * the flag-off behavior.
 */
function ExpensiveComponent({data, onClick}) {
  const processedData = expensiveProcessing(data);

  const handleClick = item => {
    onClick(item.id);
  };

  return (
    <div>
      {processedData.process(item => (
        <Item key={item.id} onClick={() => handleClick(item)} />
      ))}
    </div>
  );
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enableOptimisticBuiltinMethodShapes

/**
 * Negative case: even with @enableOptimisticBuiltinMethodShapes enabled, a
 * method whose name is NOT a known non-mutating builtin collection method
 * (here a custom `.process(...)`) must be handled conservatively. The unknown
 * receiver keeps no shape, so the call may mutate it and `expensiveProcessing`
 * stays merged into a scope keyed on both `data` and `onClick` -- identical to
 * the flag-off behavior.
 */
function ExpensiveComponent(t0) {
  const $ = _c(9);
  const { data, onClick } = t0;
  let t1;
  if ($[0] !== data || $[1] !== onClick) {
    const processedData = expensiveProcessing(data);
    let t2;
    if ($[3] !== onClick) {
      t2 = (item) => {
        onClick(item.id);
      };
      $[3] = onClick;
      $[4] = t2;
    } else {
      t2 = $[4];
    }
    const handleClick = t2;
    let t3;
    if ($[5] !== handleClick) {
      t3 = (item_0) => (
        <Item key={item_0.id} onClick={() => handleClick(item_0)} />
      );
      $[5] = handleClick;
      $[6] = t3;
    } else {
      t3 = $[6];
    }
    t1 = processedData.process(t3);
    $[0] = data;
    $[1] = onClick;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  let t2;
  if ($[7] !== t1) {
    t2 = <div>{t1}</div>;
    $[7] = t1;
    $[8] = t2;
  } else {
    t2 = $[8];
  }
  return t2;
}

```
      
### Eval output
(kind: exception) Fixture not implemented