
## Input

```javascript
// @validateRefAccessDuringRender
import {useCallback, useRef} from 'react';

function Component({previous, choose}) {
  const ref = useRef(0);
  const callback = () => ++ref.current;
  const memoized = useCallback(() => ++ref.current, []);
  const alias = callback;
  const selected = choose ? callback : memoized;

  return [
    callback === previous,
    previous !== callback,
    memoized !== previous,
    previous === memoized,
    alias === previous,
    previous !== alias,
    selected !== previous,
    previous === selected,
  ];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{previous: null, choose: true}],
  sequentialRenders: [
    {previous: null, choose: true},
    {previous: null, choose: false},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateRefAccessDuringRender
import { useCallback, useRef } from "react";

function Component(t0) {
  const $ = _c(11);
  const { previous, choose } = t0;
  const ref = useRef(0);
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = () => (ref.current = ref.current + 1);
    $[0] = t1;
  } else {
    t1 = $[0];
  }
  const callback = t1;
  let t2;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = () => (ref.current = ref.current + 1);
    $[1] = t2;
  } else {
    t2 = $[1];
  }
  const memoized = t2;
  const alias = callback;
  const selected = choose ? callback : memoized;

  const t3 = callback === previous;
  const t4 = previous !== callback;
  const t5 = memoized !== previous;
  const t6 = previous === memoized;
  const t7 = alias === previous;
  const t8 = previous !== alias;
  const t9 = selected !== previous;
  const t10 = previous === selected;
  let t11;
  if (
    $[2] !== t10 ||
    $[3] !== t3 ||
    $[4] !== t4 ||
    $[5] !== t5 ||
    $[6] !== t6 ||
    $[7] !== t7 ||
    $[8] !== t8 ||
    $[9] !== t9
  ) {
    t11 = [t3, t4, t5, t6, t7, t8, t9, t10];
    $[2] = t10;
    $[3] = t3;
    $[4] = t4;
    $[5] = t5;
    $[6] = t6;
    $[7] = t7;
    $[8] = t8;
    $[9] = t9;
    $[10] = t11;
  } else {
    t11 = $[10];
  }
  return t11;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ previous: null, choose: true }],
  sequentialRenders: [
    { previous: null, choose: true },
    { previous: null, choose: false },
  ],
};

```
      
### Eval output
(kind: ok) [false,true,true,false,false,true,true,false]
[false,true,true,false,false,true,true,false]