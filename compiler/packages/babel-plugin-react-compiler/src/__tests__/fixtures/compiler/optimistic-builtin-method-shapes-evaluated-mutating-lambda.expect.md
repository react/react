
## Input

```javascript
// @enableOptimisticBuiltinMethodShapes

/**
 * Evaluated soundness case for @enableOptimisticBuiltinMethodShapes.
 *
 * Runtime companion to
 * optimistic-builtin-method-shapes-unknown-receiver-map-mutating-lambda (a
 * compile-snapshot-only fixture), modeled on
 * array-map-mutable-array-mutating-lambda for a known array receiver.
 *
 * `getItems` is defined module-locally (not imported from shared-runtime) so
 * its return value keeps an UNKNOWN type, which is what triggers the flag path.
 * With the flag on, the unknown receiver's `.map` resolves to the builtin Array
 * `map` signature. That signature still models the callback receiving items
 * derived from the receiver (`CreateFrom`), so a callback that MUTATES its item
 * is tracked correctly and the mutation is not silently dropped: sprout runs
 * both the original and compiled output and asserts identical results.
 */
function getItems(data) {
  return data.map(value => ({value, updated: false}));
}

function Component({data}) {
  const processedData = getItems(data);
  const y = processedData.map(item => {
    item.updated = true;
    return item;
  });
  return [processedData, y];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{data: [1, 2]}],
  isComponent: false,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enableOptimisticBuiltinMethodShapes

/**
 * Evaluated soundness case for @enableOptimisticBuiltinMethodShapes.
 *
 * Runtime companion to
 * optimistic-builtin-method-shapes-unknown-receiver-map-mutating-lambda (a
 * compile-snapshot-only fixture), modeled on
 * array-map-mutable-array-mutating-lambda for a known array receiver.
 *
 * `getItems` is defined module-locally (not imported from shared-runtime) so
 * its return value keeps an UNKNOWN type, which is what triggers the flag path.
 * With the flag on, the unknown receiver's `.map` resolves to the builtin Array
 * `map` signature. That signature still models the callback receiving items
 * derived from the receiver (`CreateFrom`), so a callback that MUTATES its item
 * is tracked correctly and the mutation is not silently dropped: sprout runs
 * both the original and compiled output and asserts identical results.
 */
function getItems(data) {
  const $ = _c(2);
  let t0;
  if ($[0] !== data) {
    t0 = data.map(_temp);
    $[0] = data;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}
function _temp(value) {
  return { value, updated: false };
}

function Component(t0) {
  const $ = _c(6);
  const { data } = t0;
  let processedData;
  let t1;
  if ($[0] !== data) {
    processedData = getItems(data);
    t1 = processedData.map(_temp2);
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
function _temp2(item) {
  item.updated = true;
  return item;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ data: [1, 2] }],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) [[{"value":1,"updated":true},{"value":2,"updated":true}],["[[ cyclic ref *2 ]]","[[ cyclic ref *3 ]]"]]