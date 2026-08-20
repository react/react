
## Input

```javascript
// @validateExhaustiveMemoizationDependencies @validateExhaustiveEffectDependencies:"all"
import {
  useCallback,
  useTransition,
  useState,
  useOptimistic,
  useActionState,
  useRef,
  useReducer,
  useEffect,
} from 'react';

function useFoo() {
  const [s, setState] = useState();
  const ref = useRef(null);
  const [t, startTransition] = useTransition();
  const [u, addOptimistic] = useOptimistic();
  const [v, dispatch] = useReducer(() => {}, null);
  const [isPending, dispatchAction] = useActionState(() => {}, null);

  useEffect(() => {
    dispatch();
    startTransition(() => {});
    addOptimistic();
    setState(null);
    dispatchAction();
    ref.current = true;
  }, [
    // intentionally adding unnecessary deps on nonreactive stable values
    // to check that they're allowed
    dispatch,
    startTransition,
    addOptimistic,
    setState,
    dispatchAction,
    ref,
  ]);

  return useCallback(() => {
    dispatch();
    startTransition(() => {});
    addOptimistic();
    setState(null);
    dispatchAction();
    ref.current = true;
  }, [
    // intentionally adding unnecessary deps on nonreactive stable values
    // to check that they're allowed
    dispatch,
    startTransition,
    addOptimistic,
    setState,
    dispatchAction,
    ref,
  ]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateExhaustiveMemoizationDependencies @validateExhaustiveEffectDependencies:"all"
import {
  useCallback,
  useTransition,
  useState,
  useOptimistic,
  useActionState,
  useRef,
  useReducer,
  useEffect,
} from "react";

function useFoo() {
  const $ = _c(3);
  const [, setState] = useState();
  const ref = useRef(null);
  const [, startTransition] = useTransition();
  const [, addOptimistic] = useOptimistic();
  const [, dispatch] = useReducer(_temp, null);
  const [, dispatchAction] = useActionState(_temp2, null);
  let t0;
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = () => {
      dispatch();
      startTransition(_temp3);
      addOptimistic();
      setState(null);
      dispatchAction();
      ref.current = true;
    };
    t1 = [
      dispatch,
      startTransition,
      addOptimistic,
      setState,
      dispatchAction,
      ref,
    ];
    $[0] = t0;
    $[1] = t1;
  } else {
    t0 = $[0];
    t1 = $[1];
  }
  useEffect(t0, t1);
  let t2;
  if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = () => {
      dispatch();
      startTransition(_temp4);
      addOptimistic();
      setState(null);
      dispatchAction();
      ref.current = true;
    };
    $[2] = t2;
  } else {
    t2 = $[2];
  }
  return t2;
}
function _temp4() {}
function _temp3() {}
function _temp2() {}
function _temp() {}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
};

```
      
### Eval output
(kind: ok) "[[ function params=0 ]]"
logs: ['An optimistic state update occurred outside a transition or action. To fix, move the update to an action, or wrap with startTransition.']