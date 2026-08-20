
## Input

```javascript
import {useState} from 'react';
import {createHookWrapper} from 'shared-runtime';

function useHook({value}) {
  const [state] = useState(false);

  return {
    getX() {
      return {
        a: [],
        getY() {
          return value;
        },
        state,
      };
    },
  };
}

export const FIXTURE_ENTRYPOINT = {
  fn: createHookWrapper(useHook),
  params: [{value: 0}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useState } from "react";
import { createHookWrapper } from "shared-runtime";

function useHook(t0) {
  const $ = _c(3);
  const { value } = t0;
  const [state] = useState(false);
  let t1;
  if ($[0] !== state || $[1] !== value) {
    t1 = {
      getX() {
        return {
          a: [],
          getY() {
            return value;
          },
          state,
        };
      },
    };
    $[0] = state;
    $[1] = value;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: createHookWrapper(useHook),
  params: [{ value: 0 }],
};

```
      
### Eval output
(kind: ok) <div>{"result":{"getX":{"kind":"Function","result":{"a":[],"getY":{"kind":"Function","result":0},"state":false}}},"shouldInvokeFns":true}</div>