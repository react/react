
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees
import {useCallback, useLayoutEffect, useMemo, useRef, useState} from 'react';

/**
 * Repro from https://github.com/react/react/issues/35118
 *
 * `setObservable` comes out of a pruned scope, but it is still stable, so
 * `restart` only depends on `observable`.
 */
function useSubscription(options) {
  const {skip} = options;
  const recreate = () => (skip ? undefined : {});
  let [observable, setObservable] = useState(options.skip ? null : recreate);
  const recreateRef = useRef(recreate);
  useLayoutEffect(() => {
    recreateRef.current = recreate;
  });
  if (!skip && !observable) {
    setObservable((observable = recreate()));
  }
  const restart = useCallback(() => {
    if (observable) {
      setObservable(recreateRef.current());
    }
  }, [observable]);
  return useMemo(() => ({restart}), [restart]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: useSubscription,
  params: [{skip: false}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validatePreserveExistingMemoizationGuarantees
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

/**
 * Repro from https://github.com/react/react/issues/35118
 *
 * `setObservable` comes out of a pruned scope, but it is still stable, so
 * `restart` only depends on `observable`.
 */
function useSubscription(options) {
  const $ = _c(8);
  const { skip } = options;
  let t0;
  if ($[0] !== skip) {
    t0 = () => (skip ? undefined : {});
    $[0] = skip;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const recreate = t0;
  const [t1, setObservable] = useState(options.skip ? null : recreate);
  let observable = t1;
  const recreateRef = useRef(recreate);
  let t2;
  if ($[2] !== recreate) {
    t2 = () => {
      recreateRef.current = recreate;
    };
    $[2] = recreate;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  useLayoutEffect(t2);
  if (!skip && !observable) {
    setObservable((observable = recreate()));
  }
  let t3;
  if ($[4] !== observable) {
    t3 = () => {
      if (observable) {
        setObservable(recreateRef.current());
      }
    };
    $[4] = observable;
    $[5] = t3;
  } else {
    t3 = $[5];
  }

  observable;
  const restart = t3;
  let t4;
  if ($[6] !== restart) {
    t4 = { restart };
    $[6] = restart;
    $[7] = t4;
  } else {
    t4 = $[7];
  }
  return t4;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useSubscription,
  params: [{ skip: false }],
};

```
      
### Eval output
(kind: ok) {"restart":"[[ function params=0 ]]"}