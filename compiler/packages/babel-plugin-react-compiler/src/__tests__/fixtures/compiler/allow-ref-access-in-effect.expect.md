
## Input

```javascript
// @validateRefAccessDuringRender
import {useEffect, useRef, useState} from 'react';

function Component() {
  const ref = useRef(null);
  const [state, setState] = useState(false);
  useEffect(() => {
    ref.current = 'Ok';
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
  const $ = _c(6);
  const ref = useRef(null);
  const [state, setState] = useState(false);
  let t0;
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = () => {
      ref.current = "Ok";
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
  let t3;
  if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = () => {
      setState(true);
    };
    t3 = [];
    $[2] = t2;
    $[3] = t3;
  } else {
    t2 = $[2];
    t3 = $[3];
  }
  useEffect(t2, t3);

  const t4 = String(state);
  let t5;
  if ($[4] !== t4) {
    t5 = <Child key={t4} ref={ref} />;
    $[4] = t4;
    $[5] = t5;
  } else {
    t5 = $[5];
  }
  return t5;
}

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
(kind: ok) Ok