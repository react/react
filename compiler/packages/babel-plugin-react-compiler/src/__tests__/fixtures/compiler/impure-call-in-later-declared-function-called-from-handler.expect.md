
## Input

```javascript
// @validateNoImpureFunctionsInRender
import {useState} from 'react';

function Component() {
  const [state, setState] = useState('idle');
  const arm = () => {
    setTimeout(tick, 1000);
  };
  const tick = () => {
    setState(String(Date.now()));
    arm();
  };
  return <button onClick={arm}>{state}</button>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateNoImpureFunctionsInRender
import { useState } from "react";

function Component() {
  const $ = _c(3);
  const [state, setState] = useState("idle");
  let arm;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    arm = () => {
      setTimeout(tick, 1000);
    };

    const tick = () => {
      setState(String(Date.now()));
      arm();
    };
    $[0] = arm;
  } else {
    arm = $[0];
  }
  let t0;
  if ($[1] !== state) {
    t0 = <button onClick={arm}>{state}</button>;
    $[1] = state;
    $[2] = t0;
  } else {
    t0 = $[2];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) <button>idle</button>