
## Input

```javascript
// @enableOptimisticBuiltinMethodShapes

/**
 * Regression test for https://github.com/facebook/react/issues/35902
 *
 * `expensiveProcessing(data)` returns a value with an unknown type. Calling the
 * known non-mutating builtin `.map` on it should NOT extend the receiver's
 * mutable range, so `expensiveProcessing(data)` gets its own reactive scope
 * keyed only on `data` -- it must not re-run when only `onClick` changes.
 *
 * With @enableOptimisticBuiltinMethodShapes the `.map` receiver resolves to the
 * builtin Array shape, whose `map` reads (rather than conditionally mutates)
 * the receiver. Compare with the -flag-off variant, which keeps the
 * conservative behavior where `expensiveProcessing` is merged into a scope
 * keyed on both `data` and `onClick`.
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
import { c as _c } from "react/compiler-runtime"; // @enableOptimisticBuiltinMethodShapes

/**
 * Regression test for https://github.com/facebook/react/issues/35902
 *
 * `expensiveProcessing(data)` returns a value with an unknown type. Calling the
 * known non-mutating builtin `.map` on it should NOT extend the receiver's
 * mutable range, so `expensiveProcessing(data)` gets its own reactive scope
 * keyed only on `data` -- it must not re-run when only `onClick` changes.
 *
 * With @enableOptimisticBuiltinMethodShapes the `.map` receiver resolves to the
 * builtin Array shape, whose `map` reads (rather than conditionally mutates)
 * the receiver. Compare with the -flag-off variant, which keeps the
 * conservative behavior where `expensiveProcessing` is merged into a scope
 * keyed on both `data` and `onClick`.
 */
function ExpensiveComponent(t0) {
  const $ = _c(7);
  const { data, onClick } = t0;
  let t1;
  if ($[0] !== data) {
    t1 = expensiveProcessing(data);
    $[0] = data;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const processedData = t1;
  let t2;
  if ($[2] !== onClick) {
    t2 = (item) => {
      onClick(item.id);
    };
    $[2] = onClick;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  const handleClick = t2;
  let t3;
  if ($[4] !== handleClick || $[5] !== processedData) {
    t3 = (
      <div>
        {processedData.map((item_0) => (
          <Item key={item_0.id} onClick={() => handleClick(item_0)} />
        ))}
      </div>
    );
    $[4] = handleClick;
    $[5] = processedData;
    $[6] = t3;
  } else {
    t3 = $[6];
  }
  return t3;
}

```
      
### Eval output
(kind: exception) Fixture not implemented