
## Input

```javascript
import type {SetStateAction, Dispatch} from 'react';
import {useState} from 'react';

function Component(_props: {}) {
  const [x, _setX]: [number, Dispatch<SetStateAction<number>>] = useState(0);
  return {x};
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import type { SetStateAction, Dispatch } from "react";
import { useState } from "react";

function Component(_props) {
  const $ = _c(2);
  const [x] = useState(0);
  let t0;
  if ($[0] !== x) {
    t0 = { x };
    $[0] = x;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) {"x":0}