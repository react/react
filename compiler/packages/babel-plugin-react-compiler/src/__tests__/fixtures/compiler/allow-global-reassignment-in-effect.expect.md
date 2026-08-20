
## Input

```javascript
import {useEffect, useState} from 'react';

let someGlobal = false;

function Component() {
  const [state, setState] = useState(someGlobal);

  useEffect(() => {
    someGlobal = true;
  }, []);

  useEffect(() => {
    setState(someGlobal);
  }, [someGlobal]);

  return <div>{String(state)}</div>;
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

let someGlobal = false;

function Component() {
  const $ = _c(5);
  const [state, setState] = useState(someGlobal);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = [];
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  useEffect(_temp, t0);
  let t1;
  let t2;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = () => {
      setState(someGlobal);
    };
    t2 = [someGlobal];
    $[1] = t1;
    $[2] = t2;
  } else {
    t1 = $[1];
    t2 = $[2];
  }
  useEffect(t1, t2);

  const t3 = String(state);
  let t4;
  if ($[3] !== t3) {
    t4 = <div>{t3}</div>;
    $[3] = t3;
    $[4] = t4;
  } else {
    t4 = $[4];
  }
  return t4;
}
function _temp() {
  someGlobal = true;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) <div>true</div>