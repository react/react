
## Input

```javascript
// @enablePreserveExistingMemoizationGuarantees:false @validateExhaustiveMemoizationDependencies:false
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
  }, [props.value]);

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
// @enablePreserveExistingMemoizationGuarantees:false @validateExhaustiveMemoizationDependencies:false
import { useCallback } from "react";
import {
  identity,
  makeObject_Primitives,
  mutate,
  useHook,
} from "shared-runtime";

function Component(props) {
  const free = makeObject_Primitives();
  const free2 = makeObject_Primitives();
  const part = free2.part;
  useHook();
  const callback = () => {
    const x = makeObject_Primitives();
    x.value = props.value;
    mutate(x, free, part);
  };

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