
## Input

```javascript
// @validateRefAccessDuringRender
import {useEffect, useRef, useState} from 'react';

function Component() {
  const ref = useRef(null);
  const [state, setState] = useState(false);
  useEffect(() => {
    const callback = () => {
      ref.current = 'Ok';
    };
  }, []);

  useEffect(() => {
    setState(true);
  }, []);

  // We use state to force a re-render and observe whether the
  // ref updated. This lets us check that the effect actually ran
  // and wasn't DCE'd
  return <Child key={String(state)} ref={ref} />;
}

function Child({ref}) {
  'use no memo';
  // This violates the rules of React, so we access the ref in a child
  // component
  return ref.current;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateRefAccessDuringRender
import { useEffect, useRef, useState } from "react";

function Component() {
  const $ = _c(5);
  const ref = useRef(null);
  const [state, setState] = useState(false);
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
      setState(true);
    };
    t2 = [];
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
    t4 = <Child key={t3} ref={ref} />;
    $[3] = t3;
    $[4] = t4;
  } else {
    t4 = $[4];
  }
  return t4;
}
function _temp() {}

function Child({ ref }) {
  "use no memo";
  // This violates the rules of React, so we access the ref in a child
  // component
  return ref.current;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) 