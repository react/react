
## Input

```javascript
import {useMemo} from 'react';
import {Stringify} from 'shared-runtime';

function Component({}) {
  let a = 'a';
  let b = '';
  [a, b] = [null, null];
  // NOTE: reference `a` in a callback to force a context variable
  return <Stringify a={a} b={b} onClick={() => a} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useMemo } from "react";
import { Stringify } from "shared-runtime";

function Component(t0) {
  const $ = _c(4);
  let a;
  let b;
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    a = "a";
    const [t2, t3] = [null, null];
    t1 = t3;
    a = t2;
    $[0] = a;
    $[1] = b;
    $[2] = t1;
  } else {
    a = $[0];
    b = $[1];
    t1 = $[2];
  }
  b = t1;
  let t2;
  if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = <Stringify a={a} b={b} onClick={() => a} />;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) <div>{"a":null,"b":"[[ cyclic ref *1 ]]","onClick":"[[ function params=0 ]]"}</div>