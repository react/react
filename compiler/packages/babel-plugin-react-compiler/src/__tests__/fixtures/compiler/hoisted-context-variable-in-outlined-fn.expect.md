
## Input

```javascript
import {CONST_TRUE, useIdentity} from 'shared-runtime';

const hidden = CONST_TRUE;
function useFoo() {
  const makeCb = useIdentity(() => {
    const logIntervalId = () => {
      log(intervalId);
    };

    let intervalId;
    if (!hidden) {
      intervalId = 2;
    }
    return () => {
      logIntervalId();
    };
  });

  return <Stringify fn={makeCb()} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { CONST_TRUE, useIdentity } from "shared-runtime";

const hidden = CONST_TRUE;
function useFoo() {
  const $ = _c(4);
  const makeCb = useIdentity(_temp);
  let t0;
  if ($[0] !== makeCb) {
    t0 = makeCb();
    $[0] = makeCb;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  let t1;
  if ($[2] !== t0) {
    t1 = <Stringify fn={t0} shouldInvokeFns={true} />;
    $[2] = t0;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  return t1;
}
function _temp() {
  const logIntervalId = () => {
    log(intervalId);
  };
  let intervalId;
  if (!hidden) {
    intervalId = 2;
  }
  return () => {
    logIntervalId();
  };
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
};

```
      
### Eval output
(kind: exception) Stringify is not defined