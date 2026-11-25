
## Input

```javascript
import {createHookWrapper, useIdentity} from 'shared-runtime';

/**
 * Functions passed as hook arguments may not run during render (e.g. effects),
 * so their property loads are not hoistable.
 */
function useMakeCallback({
  obj,
  setState,
}: {
  obj: {value: number};
  setState: (newState: number) => void;
}) {
  const cb = useIdentity(() => setState(obj.value));
  return cb;
}

const setState = (arg: number) => {
  'use no memo';
  return arg;
};
export const FIXTURE_ENTRYPOINT = {
  fn: createHookWrapper(useMakeCallback),
  params: [{obj: {value: 1}, setState}],
  sequentialRenders: [
    {obj: {value: 1}, setState},
    {obj: {value: 2}, setState},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { createHookWrapper, useIdentity } from "shared-runtime";

/**
 * Functions passed as hook arguments may not run during render (e.g. effects),
 * so their property loads are not hoistable.
 */
function useMakeCallback(t0) {
  const $ = _c(3);
  const { obj, setState } = t0;
  let t1;
  if ($[0] !== obj || $[1] !== setState) {
    t1 = () => setState(obj.value);
    $[0] = obj;
    $[1] = setState;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  const cb = useIdentity(t1);
  return cb;
}

const setState = (arg: number) => {
  "use no memo";
  return arg;
};
export const FIXTURE_ENTRYPOINT = {
  fn: createHookWrapper(useMakeCallback),
  params: [{ obj: { value: 1 }, setState }],
  sequentialRenders: [
    { obj: { value: 1 }, setState },
    { obj: { value: 2 }, setState },
  ],
};

```
      
### Eval output
(kind: ok) <div>{"result":{"kind":"Function","result":1},"shouldInvokeFns":true}</div>
<div>{"result":{"kind":"Function","result":2},"shouldInvokeFns":true}</div>