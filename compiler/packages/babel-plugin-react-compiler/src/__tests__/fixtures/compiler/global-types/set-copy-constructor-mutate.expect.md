
## Input

```javascript
import {makeArray, mutate} from 'shared-runtime';

function useFoo({propArr}: {propArr: Array<number>}) {
  const s1 = new Set<number | Array<number>>([1, 2, 3]);
  s1.add(makeArray(propArr[0]));

  const s2 = new Set(s1);
  // this may also may mutate s1
  mutate(s2);

  return [s1, s2];
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{propArr: [7, 8, 9]}],
  sequentialRenders: [
    {propArr: [7, 8, 9]},
    {propArr: [7, 8, 9]},
    {propArr: [7, 8, 10]},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { makeArray, mutate } from "shared-runtime";

function useFoo(t0) {
  const $ = _c(6);
  const { propArr } = t0;
  let s1;
  let s2;
  if ($[0] !== propArr[0]) {
    s1 = new Set([1, 2, 3]);
    s1.add(makeArray(propArr[0]));
    s2 = new Set(s1);

    mutate(s2);
    $[0] = propArr[0];
    $[1] = s1;
    $[2] = s2;
  } else {
    s1 = $[1];
    s2 = $[2];
  }
  let t1;
  if ($[3] !== s1 || $[4] !== s2) {
    t1 = [s1, s2];
    $[3] = s1;
    $[4] = s2;
    $[5] = t1;
  } else {
    t1 = $[5];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{ propArr: [7, 8, 9] }],
  sequentialRenders: [
    { propArr: [7, 8, 9] },
    { propArr: [7, 8, 9] },
    { propArr: [7, 8, 10] },
  ],
};

```
      
### Eval output
(kind: ok) [{"kind":"Set","value":[1,2,3,[7]]},{"kind":"Set","value":[1,2,3,"[[ cyclic ref *2 ]]"]}]
[{"kind":"Set","value":[1,2,3,[7]]},{"kind":"Set","value":[1,2,3,"[[ cyclic ref *2 ]]"]}]
[{"kind":"Set","value":[1,2,3,[7]]},{"kind":"Set","value":[1,2,3,"[[ cyclic ref *2 ]]"]}]