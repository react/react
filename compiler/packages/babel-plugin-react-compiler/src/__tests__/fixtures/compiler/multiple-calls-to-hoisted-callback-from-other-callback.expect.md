
## Input

```javascript
import {useState} from 'react';

function Component(props) {
  const [_state, setState] = useState();
  const a = () => {
    return b();
  };
  const b = () => {
    return (
      <>
        <div onClick={() => onClick(true)}>a</div>
        <div onClick={() => onClick(false)}>b</div>
      </>
    );
  };
  const onClick = value => {
    setState(value);
  };

  return <div>{a()}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useState } from "react";

function Component(props) {
  const $ = _c(1);
  const [, setState] = useState();
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    const a = () => b();
    const b = () => (
      <>
        <div onClick={() => onClick(true)}>a</div>
        <div onClick={() => onClick(false)}>b</div>
      </>
    );
    const onClick = (value) => {
      setState(value);
    };
    t0 = <div>{a()}</div>;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) <div><div>a</div><div>b</div></div>