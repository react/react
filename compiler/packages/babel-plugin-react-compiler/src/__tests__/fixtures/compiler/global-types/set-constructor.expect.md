
## Input

```javascript
import {makeArray} from 'shared-runtime';

function useHook({el1, el2}) {
  const s = new Set();
  s.add(makeArray(el1));
  s.add(makeArray(el2));
  return s.size;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useHook,
  params: [{el1: 1, el2: 'foo'}],
  sequentialRenders: [
    {el1: 1, el2: 'foo'},
    {el1: 2, el2: 'foo'},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { makeArray } from "shared-runtime";

function useHook(t0) {
  const $ = _c(7);
  const { el1, el2 } = t0;
  let s;
  if ($[0] !== el1 || $[1] !== el2) {
    s = new Set();
    let t1;
    if ($[3] !== el1) {
      t1 = makeArray(el1);
      $[3] = el1;
      $[4] = t1;
    } else {
      t1 = $[4];
    }
    s.add(t1);
    let t2;
    if ($[5] !== el2) {
      t2 = makeArray(el2);
      $[5] = el2;
      $[6] = t2;
    } else {
      t2 = $[6];
    }
    s.add(t2);
    $[0] = el1;
    $[1] = el2;
    $[2] = s;
  } else {
    s = $[2];
  }
  return s.size;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useHook,
  params: [{ el1: 1, el2: "foo" }],
  sequentialRenders: [
    { el1: 1, el2: "foo" },
    { el1: 2, el2: "foo" },
  ],
};

```
      
### Eval output
(kind: ok) 2
2