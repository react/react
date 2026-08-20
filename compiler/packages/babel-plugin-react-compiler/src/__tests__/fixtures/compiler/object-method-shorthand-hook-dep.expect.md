
## Input

```javascript
import {createHookWrapper} from 'shared-runtime';
import {useState} from 'react';
function useFoo() {
  const [state, _setState] = useState(false);
  return {
    func() {
      return state;
    },
  };
}

export const FIXTURE_ENTRYPOINT = {
  fn: createHookWrapper(useFoo),
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { createHookWrapper } from "shared-runtime";
import { useState } from "react";
function useFoo() {
  const $ = _c(2);
  const [state] = useState(false);
  let t0;
  if ($[0] !== state) {
    t0 = {
      func() {
        return state;
      },
    };
    $[0] = state;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: createHookWrapper(useFoo),
  params: [{}],
};

```
      
### Eval output
(kind: ok) <div>{"result":{"func":{"kind":"Function","result":false}},"shouldInvokeFns":true}</div>