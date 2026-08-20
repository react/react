
## Input

```javascript
// @flow

import {useImperativeHandle, useRef} from 'react';

component Component(prop: number) {
  const ref1 = useRef(null);
  const ref2 = useRef(1);
  useImperativeHandle(ref1, () => {
    const precomputed = prop + ref2.current;
    return {
      foo: () => prop + ref2.current + precomputed,
    };
  }, [prop]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{prop: 1}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";

import { useImperativeHandle, useRef } from "react";

function Component(t0) {
  const $ = _c(3);
  const { prop } = t0;
  const ref1 = useRef(null);
  const ref2 = useRef(1);
  let t1;
  let t2;
  if ($[0] !== prop) {
    t1 = () => {
      const precomputed = prop + ref2.current;
      return { foo: () => prop + ref2.current + precomputed };
    };
    t2 = [prop];
    $[0] = prop;
    $[1] = t1;
    $[2] = t2;
  } else {
    t1 = $[1];
    t2 = $[2];
  }
  useImperativeHandle(ref1, t1, t2);
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ prop: 1 }],
};

```
      
### Eval output
(kind: ok) 