
## Input

```javascript
import {useState} from 'react';
import {Stringify} from 'shared-runtime';

function Component() {
  let [state, setState] = useState(0);
  return (
    <div>
      <Stringify text="Counter" />
      <span>{state}</span>
      <button data-testid="button" onClick={() => setState(state + 1)}>
        increment
      </button>
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 42}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useState } from "react";
import { Stringify } from "shared-runtime";

function Component() {
  const $ = _c(8);
  const [state, setState] = useState(0);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = <Stringify text="Counter" />;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  let t1;
  if ($[1] !== state) {
    t1 = <span>{state}</span>;
    $[1] = state;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  let t2;
  if ($[3] !== state) {
    t2 = (
      <button data-testid="button" onClick={() => setState(state + 1)}>
        increment
      </button>
    );
    $[3] = state;
    $[4] = t2;
  } else {
    t2 = $[4];
  }
  let t3;
  if ($[5] !== t1 || $[6] !== t2) {
    t3 = (
      <div>
        {t0}
        {t1}
        {t2}
      </div>
    );
    $[5] = t1;
    $[6] = t2;
    $[7] = t3;
  } else {
    t3 = $[7];
  }
  return t3;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: 42 }],
};

```
      
### Eval output
(kind: ok) <div><div>{"text":"Counter"}</div><span>0</span><button data-testid="button">increment</button></div>