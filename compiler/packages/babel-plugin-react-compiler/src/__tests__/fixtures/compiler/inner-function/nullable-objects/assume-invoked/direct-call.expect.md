
## Input

```javascript
import {useState} from 'react';
import {useIdentity} from 'shared-runtime';

function useMakeCallback({obj}: {obj: {value: number}}) {
  const [state, setState] = useState(0);
  const cb = () => {
    if (obj.value !== state) setState(obj.value);
  };
  useIdentity();
  cb();
  return [cb];
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

function useMakeCallback(t0) {
  const $ = _c(5);
  const { obj } = t0;
  const [state, setState] = useState(0);
  let t1;
  if ($[0] !== obj.value || $[1] !== state) {
    t1 = () => {
      if (obj.value !== state) {
        setState(obj.value);
      }
    };
    $[0] = obj.value;
    $[1] = state;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  const cb = t1;

  useIdentity();
  cb();
  let t2;
  if ($[3] !== cb) {
    t2 = [cb];
    $[3] = cb;
    $[4] = t2;
  } else {
    t2 = $[4];
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
(kind: ok) ["[[ function params=0 ]]"]
["[[ function params=0 ]]"]