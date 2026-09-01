
## Input

```javascript
// @enablePreserveExistingMemoizationGuarantees
import {useCallback} from 'react';
import {identity, makeObject_Primitives, mutate, useHook} from 'shared-runtime';

function Component(props) {
  const free = makeObject_Primitives();
  const free2 = makeObject_Primitives();
  const part = free2.part;
  useHook();
  const callback = useCallback(() => {
    const x = makeObject_Primitives();
    x.value = props.value;
    mutate(x, free, part);
  }, [props.value, free, part]);
  mutate(free, part);
  return callback;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 42}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enablePreserveExistingMemoizationGuarantees
import { useCallback } from "react";
import {
  identity,
  makeObject_Primitives,
  mutate,
  useHook,
} from "shared-runtime";

function Component(props) {
  const $ = _c(4);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = makeObject_Primitives();
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const free = t0;
  let t1;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = makeObject_Primitives();
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const free2 = t1;
  const part = free2.part;
  useHook();
  let t2;
  if ($[2] !== props.value) {
    t2 = () => {
      const x = makeObject_Primitives();
      x.value = props.value;
      mutate(x, free, part);
    };
    $[2] = props.value;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  const callback = t2;

  mutate(free, part);
  return callback;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: 42 }],
};

```
      
### Eval output
(kind: ok) "[[ function params=0 ]]"