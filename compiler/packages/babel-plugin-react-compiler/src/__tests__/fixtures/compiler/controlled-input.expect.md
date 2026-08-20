
## Input

```javascript
import {useState} from 'react';
function component() {
  let [x, setX] = useState(0);
  const handler = event => setX(event.target.value);
  return <input onChange={handler} value={x} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: [],
  isComponent: true,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useState } from "react";
function component() {
  const $ = _c(3);
  const [x, setX] = useState(0);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = (event) => setX(event.target.value);
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const handler = t0;
  let t1;
  if ($[1] !== x) {
    t1 = <input onChange={handler} value={x} />;
    $[1] = x;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: [],
  isComponent: true,
};

```
      
### Eval output
(kind: ok) <input value="0">