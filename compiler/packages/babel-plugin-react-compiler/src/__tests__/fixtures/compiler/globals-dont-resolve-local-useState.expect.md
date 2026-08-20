
## Input

```javascript
import {useState as _useState, useCallback, useEffect} from 'react';
import {ValidateMemoization} from 'shared-runtime';

function useState(value) {
  const [state, setState] = _useState(value);
  return [state, setState];
}

function Component() {
  const [state, setState] = useState('hello');

  return <div onClick={() => setState('goodbye')}>{state}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useState as _useState, useCallback, useEffect } from "react";
import { ValidateMemoization } from "shared-runtime";

function useState(value) {
  const $ = _c(2);
  const [state, setState] = _useState(value);
  let t0;
  if ($[0] !== state) {
    t0 = [state, setState];
    $[0] = state;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

function Component() {
  const $ = _c(5);
  const [state, setState] = useState("hello");
  let t0;
  if ($[0] !== setState) {
    t0 = () => setState("goodbye");
    $[0] = setState;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  let t1;
  if ($[2] !== state || $[3] !== t0) {
    t1 = <div onClick={t0}>{state}</div>;
    $[2] = state;
    $[3] = t0;
    $[4] = t1;
  } else {
    t1 = $[4];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) <div>hello</div>