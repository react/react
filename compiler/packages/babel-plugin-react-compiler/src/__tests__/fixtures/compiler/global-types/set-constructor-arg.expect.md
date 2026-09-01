
## Input

```javascript
const MODULE_LOCAL = new Set([4, 5, 6]);
function useFoo({propArr}: {propArr: Array<number>}) {
  /* Array can be memoized separately of the Set */
  const s1 = new Set([1, 2, 3]);
  s1.add(propArr[0]);

  /* but `.values` cannot be memoized separately */
  const s2 = new Set(MODULE_LOCAL.values());
  s2.add(propArr[1]);

  const s3 = new Set(s2.values());
  s3.add(propArr[2]);

  /**
   * s4 should be memoized separately from s3
   */
  const s4 = new Set(s3);
  s4.add(propArr[3]);
  return [s1, s2, s3, s4];
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{propArr: [7, 8, 9]}],
  sequentialRenders: [{propArr: [7, 8, 9]}, {propArr: [7, 8, 10]}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
const MODULE_LOCAL = new Set([4, 5, 6]);
function useFoo(t0) {
  const $ = _c(15);
  const { propArr } = t0;
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = [1, 2, 3];
    $[0] = t1;
  } else {
    t1 = $[0];
  }
  let s1;
  if ($[1] !== propArr[0]) {
    s1 = new Set(t1);
    s1.add(propArr[0]);
    $[1] = propArr[0];
    $[2] = s1;
  } else {
    s1 = $[2];
  }
  let s2;
  let s3;
  if ($[3] !== propArr[1] || $[4] !== propArr[2]) {
    s2 = new Set(MODULE_LOCAL.values());
    s2.add(propArr[1]);
    s3 = new Set(s2.values());
    s3.add(propArr[2]);
    $[3] = propArr[1];
    $[4] = propArr[2];
    $[5] = s2;
    $[6] = s3;
  } else {
    s2 = $[5];
    s3 = $[6];
  }
  let s4;
  if ($[7] !== propArr[3] || $[8] !== s3) {
    s4 = new Set(s3);
    s4.add(propArr[3]);
    $[7] = propArr[3];
    $[8] = s3;
    $[9] = s4;
  } else {
    s4 = $[9];
  }
  let t2;
  if ($[10] !== s1 || $[11] !== s2 || $[12] !== s3 || $[13] !== s4) {
    t2 = [s1, s2, s3, s4];
    $[10] = s1;
    $[11] = s2;
    $[12] = s3;
    $[13] = s4;
    $[14] = t2;
  } else {
    t2 = $[14];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{ propArr: [7, 8, 9] }],
  sequentialRenders: [{ propArr: [7, 8, 9] }, { propArr: [7, 8, 10] }],
};

```
      
### Eval output
(kind: ok) [{"kind":"Set","value":[1,2,3,7]},{"kind":"Set","value":[4,5,6,8]},{"kind":"Set","value":[4,5,6,8,9]},{"kind":"Set","value":[4,5,6,8,9,null]}]
[{"kind":"Set","value":[1,2,3,7]},{"kind":"Set","value":[4,5,6,8]},{"kind":"Set","value":[4,5,6,8,10]},{"kind":"Set","value":[4,5,6,8,10,null]}]