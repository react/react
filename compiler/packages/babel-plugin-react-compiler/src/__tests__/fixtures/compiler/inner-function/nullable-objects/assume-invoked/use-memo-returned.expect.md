
## Input

```javascript
// @validateExhaustiveMemoizationDependencies:false
import {useState, useMemo} from 'react';
import {useIdentity} from 'shared-runtime';

/**
 * Assume that conditionally called functions can be invoked and that their
 * property loads are hoistable to the function declaration site.
 */
function useMakeCallback({
  obj,
  shouldSynchronizeState,
}: {
  obj: {value: number};
  shouldSynchronizeState: boolean;
}) {
  const [state, setState] = useState(0);
  const cb = useMemo(() => {
    return () => {
      if (obj.value !== 0) setState(obj.value);
    };
  }, [obj.value, shouldSynchronizeState]);
  useIdentity(null);
  return cb;
}
export const FIXTURE_ENTRYPOINT = {
  fn: useMakeCallback,
  params: [{obj: {value: 1}}],
  sequentialRenders: [{obj: {value: 1}}, {obj: {value: 2}}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateExhaustiveMemoizationDependencies:false
import { useState, useMemo } from "react";
import { useIdentity } from "shared-runtime";

/**
 * Assume that conditionally called functions can be invoked and that their
 * property loads are hoistable to the function declaration site.
 */
function useMakeCallback(t0) {
  const $ = _c(2);
  const { obj, shouldSynchronizeState } = t0;
  const [, setState] = useState(0);
  let t1;
  if ($[0] !== obj.value) {
    t1 = () => {
      if (obj.value !== 0) {
        setState(obj.value);
      }
    };
    $[0] = obj.value;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const cb = t1;

  useIdentity(null);
  return cb;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useMakeCallback,
  params: [{ obj: { value: 1 } }],
  sequentialRenders: [{ obj: { value: 1 } }, { obj: { value: 2 } }],
};

```
      
### Eval output
(kind: ok) "[[ function params=0 ]]"
"[[ function params=0 ]]"