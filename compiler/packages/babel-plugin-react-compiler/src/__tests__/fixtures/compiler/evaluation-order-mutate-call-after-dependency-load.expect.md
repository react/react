
## Input

```javascript
/**
 * Test that we preserve order of evaluation on the following case scope@0
 * ```js
 * // simplified HIR
 * scope@0
 *    ...
 *    $0 = arr.length
 *    $1 = arr.push(...)
 *
 * scope@1 <-- here we should depend on $0 (the value of the property load before the
 *             mutable call)
 *   [$0, $1]
 * ```
 */
function useFoo(source: Array<number>): [number, number] {
  const arr = [1, 2, 3, ...source];
  return [arr.length, arr.push(0)];
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [[5, 6]],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; /**
 * Test that we preserve order of evaluation on the following case scope@0
 * ```js
 * // simplified HIR
 * scope@0
 *    ...
 *    $0 = arr.length
 *    $1 = arr.push(...)
 *
 * scope@1 <-- here we should depend on $0 (the value of the property load before the
 *             mutable call)
 *   [$0, $1]
 * ```
 */
function useFoo(source) {
  const $ = _c(6);
  let t0;
  let t1;
  if ($[0] !== source) {
    const arr = [1, 2, 3, ...source];
    t0 = arr.length;
    t1 = arr.push(0);
    $[0] = source;
    $[1] = t0;
    $[2] = t1;
  } else {
    t0 = $[1];
    t1 = $[2];
  }
  let t2;
  if ($[3] !== t0 || $[4] !== t1) {
    t2 = [t0, t1];
    $[3] = t0;
    $[4] = t1;
    $[5] = t2;
  } else {
    t2 = $[5];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [[5, 6]],
};

```
      
### Eval output
(kind: ok) [5,6]