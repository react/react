
## Input

```javascript
import {useEffect, useState} from 'react';

function Component() {
  const [state, setState] = useState('hello');
  useEffect(() => {
    setState('goodbye');
  }, []);

  return <div>{state}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useEffect, useState } from "react";

function Component() {
  const $ = _c(4);
  const [state, setState] = useState("hello");
  let t0;
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = () => {
      setState("goodbye");
    };
    t1 = [];
    $[0] = t0;
    $[1] = t1;
  } else {
    t0 = $[0];
    t1 = $[1];
  }
  useEffect(t0, t1);
  let t2;
  if ($[2] !== state) {
    t2 = <div>{state}</div>;
    $[2] = state;
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
(kind: ok) <div>goodbye</div>