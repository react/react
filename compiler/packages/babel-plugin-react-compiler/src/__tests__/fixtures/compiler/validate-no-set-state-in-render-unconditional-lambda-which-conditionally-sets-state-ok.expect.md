
## Input

```javascript
// @validateNoSetStateInRender
import {useState} from 'react';

function Component(props) {
  const [x, setX] = useState(0);

  const foo = () => {
    setX(1);
  };

  const bar = () => {
    if (props.cond) {
      // This call is now conditional, so this should pass validation
      foo();
    }
  };

  const baz = () => {
    bar();
  };
  baz();

  return [x];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{cond: false}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateNoSetStateInRender
import { useState } from "react";

function Component(props) {
  const $ = _c(2);
  const [x, setX] = useState(0);

  const foo = () => {
    setX(1);
  };

  const bar = () => {
    if (props.cond) {
      foo();
    }
  };

  const baz = () => {
    bar();
  };

  baz();
  let t0;
  if ($[0] !== x) {
    t0 = [x];
    $[0] = x;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ cond: false }],
};

```
      
### Eval output
(kind: ok) [0]