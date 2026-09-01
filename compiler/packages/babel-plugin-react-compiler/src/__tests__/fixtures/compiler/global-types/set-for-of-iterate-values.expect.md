
## Input

```javascript
import {makeArray, useHook} from 'shared-runtime';

function useFoo({propArr}: {propArr: Array<number>}) {
  const s1 = new Set<number | Array<number>>([1, 2, 3]);
  s1.add(makeArray(propArr[0]));

  useHook();
  const s2 = new Set();
  for (const el of s1.values()) {
    s2.add(el);
  }

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
import { makeArray, useHook } from "shared-runtime";

function useFoo(t0) {
  const { propArr } = t0;
  const s1 = new Set([1, 2, 3]);
  s1.add(makeArray(propArr[0]));

  useHook();
  const s2 = new Set();
  for (const el of s1.values()) {
    s2.add(el);
  }

  return [s1, s2];
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