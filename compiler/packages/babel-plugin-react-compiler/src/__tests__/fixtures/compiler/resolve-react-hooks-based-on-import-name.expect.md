
## Input

```javascript
import {useState as useReactState} from 'react';

function Component() {
  const [state, setState] = useReactState(0);

  const onClick = () => {
    setState(s => s + 1);
  };

  return (
    <>
      Count {state}
      <button onClick={onClick}>Increment</button>
    </>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useState as useReactState } from "react";

function Component() {
  const $ = _c(4);
  const [state, setState] = useReactState(0);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = () => {
      setState((s) => s + 1);
    };
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const onClick = t0;
  let t1;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = <button onClick={onClick}>Increment</button>;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  let t2;
  if ($[2] !== state) {
    t2 = (
      <>
        Count {state}
        {t1}
      </>
    );
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
(kind: ok) Count 0<button>Increment</button>