
## Input

```javascript
// @validateNoImpureFunctionsInRender
import {useState} from 'react';

function Poll() {
  const [state, setState] = useState('idle');
  const arm = () => {
    setState(String(Date.now()));
    later();
  };
  const later = () => {
    setState('done');
  };
  return (
    <button type="button" onClick={arm}>
      {state}
    </button>
  );
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateNoImpureFunctionsInRender
import { useState } from "react";

function Poll() {
  const $ = _c(3);
  const [state, setState] = useState("idle");
  let arm;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    arm = () => {
      setState(String(Date.now()));
      later();
    };

    const later = () => {
      setState("done");
    };
    $[0] = arm;
  } else {
    arm = $[0];
  }
  let t0;
  if ($[1] !== state) {
    t0 = (
      <button type="button" onClick={arm}>
        {state}
      </button>
    );
    $[1] = state;
    $[2] = t0;
  } else {
    t0 = $[2];
  }
  return t0;
}

```
      
### Eval output
(kind: exception) Fixture not implemented