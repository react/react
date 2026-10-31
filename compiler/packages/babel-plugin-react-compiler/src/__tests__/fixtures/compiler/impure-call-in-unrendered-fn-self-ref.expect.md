
## Input

```javascript
// @validateNoImpureFunctionsInRender
import {useState} from 'react';

function Poll() {
  const [state, setState] = useState('idle');
  const tick = () => {
    setState(String(Date.now()));
    setTimeout(tick, 1000);
  };
  return (
    <button type="button" onClick={tick}>
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
  let tick;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    tick = () => {
      setState(String(Date.now()));
      setTimeout(tick, 1000);
    };
    $[0] = tick;
  } else {
    tick = $[0];
  }
  let t0;
  if ($[1] !== state) {
    t0 = (
      <button type="button" onClick={tick}>
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