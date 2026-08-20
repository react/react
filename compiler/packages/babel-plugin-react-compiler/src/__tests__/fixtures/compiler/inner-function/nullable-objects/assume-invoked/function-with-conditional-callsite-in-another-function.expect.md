
## Input

```javascript
import {createHookWrapper} from 'shared-runtime';

/**
 * (Given that the returned lambda is assumed to be invoked, see
 * return-function)
 *
 * If lambda A conditionally calls lambda B, optimistically assume that property
 * loads from lambda B has the same hoistability of ones from lambda A. This
 * helps optimize components / hooks that create and chain many helper
 * functions.
 *
 * Type systems and code readability encourage developers to colocate length and
 * null checks values in the same function as where values are used. i.e.
 * developers are unlikely to write the following code.
 * ```js
 * function useFoo(obj, objNotNullAndHasElements) {
 *   // ...
 *   const get0th = () => obj.arr[0].value;
 *   return () => objNotNullAndHasElements ? get0th : undefined;
 * }
 * ```
 *
 * In Meta code, this assumption helps reduce the number of memo dependency
 * deopts.
 */
function useMakeCallback({
  obj,
  cond,
  setState,
}: {
  obj: {value: number};
  cond: boolean;
  setState: (newState: number) => void;
}) {
  const cb = () => setState(obj.value);
  // cb's property loads are assumed to be hoistable to the start of this lambda
  return () => (cond ? cb() : undefined);
}

const setState = (arg: number) => {
  'use no memo';
  return arg;
};
export const FIXTURE_ENTRYPOINT = {
  fn: createHookWrapper(useMakeCallback),
  params: [{obj: {value: 1}, cond: true, setState}],
  sequentialRenders: [
    {obj: {value: 1}, cond: true, setState},
    {obj: {value: 2}, cond: true, setState},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { createHookWrapper } from "shared-runtime";

/**
 * (Given that the returned lambda is assumed to be invoked, see
 * return-function)
 *
 * If lambda A conditionally calls lambda B, optimistically assume that property
 * loads from lambda B has the same hoistability of ones from lambda A. This
 * helps optimize components / hooks that create and chain many helper
 * functions.
 *
 * Type systems and code readability encourage developers to colocate length and
 * null checks values in the same function as where values are used. i.e.
 * developers are unlikely to write the following code.
 * ```js
 * function useFoo(obj, objNotNullAndHasElements) {
 *   // ...
 *   const get0th = () => obj.arr[0].value;
 *   return () => objNotNullAndHasElements ? get0th : undefined;
 * }
 * ```
 *
 * In Meta code, this assumption helps reduce the number of memo dependency
 * deopts.
 */
function useMakeCallback(t0) {
  const $ = _c(6);
  const { obj, cond, setState } = t0;
  let t1;
  if ($[0] !== obj.value || $[1] !== setState) {
    t1 = () => setState(obj.value);
    $[0] = obj.value;
    $[1] = setState;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  const cb = t1;
  let t2;
  if ($[3] !== cb || $[4] !== cond) {
    t2 = () => (cond ? cb() : undefined);
    $[3] = cb;
    $[4] = cond;
    $[5] = t2;
  } else {
    t2 = $[5];
  }
  return t2;
}

const setState = (arg: number) => {
  "use no memo";
  return arg;
};
export const FIXTURE_ENTRYPOINT = {
  fn: createHookWrapper(useMakeCallback),
  params: [{ obj: { value: 1 }, cond: true, setState }],
  sequentialRenders: [
    { obj: { value: 1 }, cond: true, setState },
    { obj: { value: 2 }, cond: true, setState },
  ],
};

```
      
### Eval output
(kind: ok) <div>{"result":{"kind":"Function","result":1},"shouldInvokeFns":true}</div>
<div>{"result":{"kind":"Function","result":2},"shouldInvokeFns":true}</div>