
## Input

```javascript
/**
 * Anchor documenting the DEFAULT (flag-off) behavior for
 * https://github.com/facebook/react/issues/35902
 *
 * Without @enableOptimisticBuiltinMethodShapes, `expensiveProcessing(data)` has
 * an unknown type and `.map` is treated conservatively (may mutate its
 * receiver). The receiver's mutable range is extended through the `.map` call
 * and merged with the `onClick`-capturing callback, so `expensiveProcessing`
 * ends up in a reactive scope keyed on BOTH `data` and `onClick` -- meaning it
 * re-runs whenever `onClick` changes. This is the bug the flag opts out of; see
 * the -issue35902 variant for the fixed output.
 */
function ExpensiveComponent({data, onClick}) {
  const processedData = expensiveProcessing(data);

  const handleClick = item => {
    onClick(item.id);
  };

  return (
    <div>
      {processedData.map(item => (
        <Item key={item.id} onClick={() => handleClick(item)} />
      ))}
    </div>
  );
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; /**
 * Anchor documenting the DEFAULT (flag-off) behavior for
 * https://github.com/facebook/react/issues/35902
 *
 * Without @enableOptimisticBuiltinMethodShapes, `expensiveProcessing(data)` has
 * an unknown type and `.map` is treated conservatively (may mutate its
 * receiver). The receiver's mutable range is extended through the `.map` call
 * and merged with the `onClick`-capturing callback, so `expensiveProcessing`
 * ends up in a reactive scope keyed on BOTH `data` and `onClick` -- meaning it
 * re-runs whenever `onClick` changes. This is the bug the flag opts out of; see
 * the -issue35902 variant for the fixed output.
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
    t1 = processedData.map(t3);
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