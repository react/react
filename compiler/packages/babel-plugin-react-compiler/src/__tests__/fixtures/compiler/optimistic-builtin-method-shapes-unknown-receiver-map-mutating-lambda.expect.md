
## Input

```javascript
// @enableOptimisticBuiltinMethodShapes

/**
 * Soundness case: with @enableOptimisticBuiltinMethodShapes the unknown
 * receiver's `.map` resolves to the builtin Array `map` signature. That
 * signature still models the callback receiving items derived from the receiver
 * (`CreateFrom`), so a callback that MUTATES its item is tracked correctly --
 * the mutation is not silently dropped. This mirrors
 * array-map-mutable-array-mutating-lambda for a known array receiver.
 */
function Component({data}) {
  const processedData = getItems(data);
  const y = processedData.map(item => {
    item.updated = true;
    return item;
  });
  return [processedData, y];
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enableOptimisticBuiltinMethodShapes

/**
 * Soundness case: with @enableOptimisticBuiltinMethodShapes the unknown
 * receiver's `.map` resolves to the builtin Array `map` signature. That
 * signature still models the callback receiving items derived from the receiver
 * (`CreateFrom`), so a callback that MUTATES its item is tracked correctly --
 * the mutation is not silently dropped. This mirrors
 * array-map-mutable-array-mutating-lambda for a known array receiver.
 */
function Component(t0) {
  const $ = _c(6);
  const { data } = t0;
  let processedData;
  let t1;
  if ($[0] !== data) {
    processedData = getItems(data);
    t1 = processedData.map(_temp);
    $[0] = data;
    $[1] = processedData;
    $[2] = t1;
  } else {
    processedData = $[1];
    t1 = $[2];
  }
  const y = t1;
  let t2;
  if ($[3] !== processedData || $[4] !== y) {
    t2 = [processedData, y];
    $[3] = processedData;
    $[4] = y;
    $[5] = t2;
  } else {
    t2 = $[5];
  }
  return t2;
}
function _temp(item) {
  item.updated = true;
  return item;
}

```
      
### Eval output
(kind: exception) Fixture not implemented