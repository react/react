
## Input

```javascript
import React from 'react';
import {useState} from 'react';

const CONST = true;

let NON_REASSIGNED_LET = true;

let REASSIGNED_LET = false;
REASSIGNED_LET = true;

function reassignedFunction() {}
reassignedFunction = true;

function nonReassignedFunction() {}

class ReassignedClass {}
ReassignedClass = true;

class NonReassignedClass {}

function Component() {
  const [state] = useState(null);
  return [
    React,
    state,
    CONST,
    NON_REASSIGNED_LET,
    REASSIGNED_LET,
    reassignedFunction,
    nonReassignedFunction,
    ReassignedClass,
    NonReassignedClass,
  ];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import React from "react";
import { useState } from "react";

const CONST = true;

let NON_REASSIGNED_LET = true;

let REASSIGNED_LET = false;
REASSIGNED_LET = true;

function reassignedFunction() {}
reassignedFunction = true;

function nonReassignedFunction() {}

class ReassignedClass {}
ReassignedClass = true;

class NonReassignedClass {}

function Component() {
  const $ = _c(2);
  const [state] = useState(null);
  let t0;
  if ($[0] !== state) {
    t0 = [
      React,
      state,
      CONST,
      NON_REASSIGNED_LET,
      REASSIGNED_LET,
      reassignedFunction,
      nonReassignedFunction,
      ReassignedClass,
      NonReassignedClass,
    ];
    $[0] = state;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) [{"Children":{"map":"[[ function params=3 ]]","forEach":"[[ function params=3 ]]","count":"[[ function params=1 ]]","toArray":"[[ function params=1 ]]","only":"[[ function params=1 ]]"},"Component":"[[ function params=3 ]]","PureComponent":"[[ function params=3 ]]","__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE":{"H":{"readContext":"[[ function params=1 ]]","use":"[[ function params=1 ]]","useCallback":"[[ function params=2 ]]","useContext":"[[ function params=1 ]]","useEffect":"[[ function params=2 ]]","useImperativeHandle":"[[ function params=3 ]]","useInsertionEffect":"[[ function params=2 ]]","useLayoutEffect":"[[ function params=2 ]]","useMemo":"[[ function params=2 ]]","useReducer":"[[ function params=3 ]]","useRef":"[[ function params=1 ]]","useState":"[[ function params=1 ]]","useDebugValue":"[[ function params=0 ]]","useDeferredValue":"[[ function params=2 ]]","useTransition":"[[ function params=0 ]]","useSyncExternalStore":"[[ function params=3 ]]","useId":"[[ function params=0 ]]","useCacheRefresh":"[[ function params=0 ]]","useMemoCache":"[[ function params=1 ]]","useEffectEvent":"[[ function params=1 ]]","useHostTransitionStatus":"[[ function params=0 ]]","useFormState":"[[ function params=2 ]]","useActionState":"[[ function params=2 ]]","useOptimistic":"[[ function params=1 ]]"},"A":{"getCacheForType":"[[ function params=1 ]]","getOwner":"[[ function params=0 ]]"},"T":null,"S":"[[ function params=2 ]]","actQueue":["[[ function params=0 ]]","[[ function params=1 ]]"],"isBatchingLegacy":false,"didScheduleLegacyUpdate":false,"didUsePromise":false,"thrownErrors":[],"getCurrentStack":"[[ function params=0 ]]"},"__COMPILER_RUNTIME":{"c":"[[ function params=1 ]]"},"act":"[[ function params=1 ]]","cache":"[[ function params=1 ]]","captureOwnerStack":"[[ function params=0 ]]","cloneElement":"[[ function params=3 ]]","createContext":"[[ function params=1 ]]","createElement":"[[ function params=3 ]]","createRef":"[[ function params=0 ]]","experimental_useEffectEvent":"[[ function params=1 ]]","experimental_useOptimistic":"[[ function params=2 ]]","experimental_useResourceEffect":"[[ function params=0 ]]","forwardRef":"[[ function params=1 ]]","isValidElement":"[[ function params=1 ]]","lazy":"[[ function params=1 ]]","memo":"[[ function params=2 ]]","startTransition":"[[ function params=1 ]]","unstable_getCacheForType":"[[ function params=1 ]]","unstable_postpone":"[[ function params=1 ]]","unstable_useCacheRefresh":"[[ function params=0 ]]","use":"[[ function params=1 ]]","useActionState":"[[ function params=3 ]]","useCallback":"[[ function params=2 ]]","useContext":"[[ function params=1 ]]","useDebugValue":"[[ function params=2 ]]","useDeferredValue":"[[ function params=2 ]]","useEffect":"[[ function params=2 ]]","useId":"[[ function params=0 ]]","useImperativeHandle":"[[ function params=3 ]]","useInsertionEffect":"[[ function params=2 ]]","useLayoutEffect":"[[ function params=2 ]]","useMemo":"[[ function params=2 ]]","useOptimistic":"[[ function params=2 ]]","useReducer":"[[ function params=3 ]]","useRef":"[[ function params=1 ]]","useState":"[[ function params=1 ]]","useSyncExternalStore":"[[ function params=3 ]]","useTransition":"[[ function params=0 ]]","version":"19.0.0-experimental-4beb1fd8-20241118"},"[[ cyclic ref *6 ]]",true,true,true,true,"[[ function params=0 ]]",true,"[[ function params=0 ]]"]