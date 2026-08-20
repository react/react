
## Input

```javascript
import {useState} from 'react';
import {useIdentity} from 'shared-runtime';

/**
 * Assume that conditionally called functions can be invoked and that their
 * property loads are hoistable to the function declaration site.
 */
function useMakeCallback({obj}: {obj: {value: number}}) {
  const [state, setState] = useState(0);
  const cb = () => {
    if (obj.value !== 0) setState(obj.value);
  };
  useIdentity(null);
  if (state === 0) {
    cb();
  }
  return {cb};
}
export const FIXTURE_ENTRYPOINT = {
  fn: useMakeCallback,
  params: [{obj: {value: 1}}],
  sequentialRenders: [{obj: {value: 1}}, {obj: {value: 2}}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useState } from "react";
import { useIdentity } from "shared-runtime";

/**
 * Assume that conditionally called functions can be invoked and that their
 * property loads are hoistable to the function declaration site.
 */
function useMakeCallback(t0) {
  const $ = _c(4);
  const { obj } = t0;
  const [state, setState] = useState(0);
  let t1;
  if ($[0] !== obj.value) {
    t1 = () => {
      if (obj.value !== 0) {
        setState(obj.value);
      }
    };
    $[0] = obj.value;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const cb = t1;

  useIdentity(null);
  if (state === 0) {
    cb();
  }
  let t2;
  if ($[2] !== cb) {
    t2 = { cb };
    $[2] = cb;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useMakeCallback,
  params: [{ obj: { value: 1 } }],
  sequentialRenders: [{ obj: { value: 1 } }, { obj: { value: 2 } }],
};

```
      
### Eval output
(kind: ok) {"cb":"[[ function params=0 ]]"}
{"cb":"[[ function params=0 ]]"}