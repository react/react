
## Input

```javascript
// @validateNoFreezingKnownMutableFunctions @enableNewMutationAliasingModel
import {useCallback, useEffect, useRef} from 'react';
import {useHook} from 'shared-runtime';

// This was a false positive "can't freeze mutable function" in the old
// inference model, fixed in the new inference model.
function Component() {
  const params = useHook();
  const update = useCallback(
    partialParams => {
      const nextParams = {
        ...params,
        ...partialParams,
      };
      nextParams.param = 'value';
      console.log(nextParams);
    },
    [params]
  );
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current === null) {
      update();
    }
  }, [update]);

  return 'ok';
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateNoFreezingKnownMutableFunctions @enableNewMutationAliasingModel
import { useCallback, useEffect, useRef } from "react";
import { useHook } from "shared-runtime";

// This was a false positive "can't freeze mutable function" in the old
// inference model, fixed in the new inference model.
function Component() {
  const $ = _c(5);
  const params = useHook();
  let t0;
  if ($[0] !== params) {
    t0 = (partialParams) => {
      const nextParams = { ...params, ...partialParams };
      nextParams.param = "value";
      console.log(nextParams);
    };
    $[0] = params;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const update = t0;

  const ref = useRef(null);
  let t1;
  let t2;
  if ($[2] !== update) {
    t1 = () => {
      if (ref.current === null) {
        update();
      }
    };
    t2 = [update];
    $[2] = update;
    $[3] = t1;
    $[4] = t2;
  } else {
    t1 = $[3];
    t2 = $[4];
  }
  useEffect(t1, t2);

  return "ok";
}

```
      
### Eval output
(kind: exception) Fixture not implemented