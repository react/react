
## Input

```javascript
// @validateRefAccessDuringRender @validateNoSetStateInRender:false
import {useCallback, useEffect, useRef, useState} from 'react';

function Component() {
  const ref = useRef(null);
  const [state, setState] = useState(false);
  const setRef = useCallback(() => {
    ref.current = 'Ok';
  }, []);

  useEffect(() => {
    setRef();
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
import { c as _c } from "react/compiler-runtime"; // @validateRefAccessDuringRender @validateNoSetStateInRender:false
import { useCallback, useEffect, useRef, useState } from "react";

function Component() {
  const $ = _c(7);
  const ref = useRef(null);
  const [state, setState] = useState(false);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = () => {
      ref.current = "Ok";
    };
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const setRef = t0;
  let t1;
  let t2;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = () => {
      setRef();
    };
    t2 = [];
    $[1] = t1;
    $[2] = t2;
  } else {
    t1 = $[1];
    t2 = $[2];
  }
  useEffect(t1, t2);
  let t3;
  let t4;
  if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
    t3 = () => {
      setState(true);
    };
    t4 = [];
    $[3] = t3;
    $[4] = t4;
  } else {
    t3 = $[3];
    t4 = $[4];
  }
  useEffect(t3, t4);

  const t5 = String(state);
  let t6;
  if ($[5] !== t5) {
    t6 = <Child key={t5} ref={ref} />;
    $[5] = t5;
    $[6] = t6;
  } else {
    t6 = $[6];
  }
  return t6;
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