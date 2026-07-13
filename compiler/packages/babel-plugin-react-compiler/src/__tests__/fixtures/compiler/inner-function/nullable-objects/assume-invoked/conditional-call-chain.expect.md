
## Input

```javascript
import {useRef} from 'react';
import {Stringify} from 'shared-runtime';

function Component({a, b}) {
  const logA = () => {
    console.log(a.value);
  };
  const logB = () => {
    console.log(b.value);
  };
  const hasLogged = useRef(false);
  const log = () => {
    if (!hasLogged.current) {
      logA();
      logB();
      hasLogged.current = true;
    }
  };
  return <Stringify log={log} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: {value: 1}, b: {value: 2}}],
  sequentialRenders: [
    {a: {value: 1}, b: {value: 2}},
    {a: {value: 3}, b: {value: 4}},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useRef } from "react";
import { Stringify } from "shared-runtime";

function Component(t0) {
  const $ = _c(7);
  const { a, b } = t0;
  let t1;
  if ($[0] !== a.value) {
    t1 = () => {
      console.log(a.value);
    };
    $[0] = a.value;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const logA = t1;
  let t2;
  if ($[2] !== b.value) {
    t2 = () => {
      console.log(b.value);
    };
    $[2] = b.value;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  const logB = t2;

  const hasLogged = useRef(false);
  let t3;
  if ($[4] !== logA || $[5] !== logB) {
    const log = () => {
      if (!hasLogged.current) {
        logA();
        logB();
        hasLogged.current = true;
      }
    };
    t3 = <Stringify log={log} shouldInvokeFns={true} />;
    $[4] = logA;
    $[5] = logB;
    $[6] = t3;
  } else {
    t3 = $[6];
  }
  return t3;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ a: { value: 1 }, b: { value: 2 } }],
  sequentialRenders: [
    { a: { value: 1 }, b: { value: 2 } },
    { a: { value: 3 }, b: { value: 4 } },
  ],
};

```
      
### Eval output
(kind: ok) <div>{"log":{"kind":"Function"},"shouldInvokeFns":true}</div>
<div>{"log":{"kind":"Function"},"shouldInvokeFns":true}</div>
logs: [1,2]