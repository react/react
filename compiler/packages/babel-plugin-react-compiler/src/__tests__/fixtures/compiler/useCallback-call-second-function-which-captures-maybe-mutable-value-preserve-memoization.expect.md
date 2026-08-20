
## Input

```javascript
// @enablePreserveExistingMemoizationGuarantees
import {useCallback} from 'react';
import {
  identity,
  logValue,
  makeObject_Primitives,
  useHook,
} from 'shared-runtime';

function Component(props) {
  const object = makeObject_Primitives();

  useHook();

  const log = () => {
    logValue(object);
  };

  const onClick = useCallback(() => {
    log();
  }, [log]);

  identity(object);

  return <div onClick={onClick} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enablePreserveExistingMemoizationGuarantees
import { useCallback } from "react";
import {
  identity,
  logValue,
  makeObject_Primitives,
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
  const object = t0;

  useHook();
  let t1;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = () => {
      logValue(object);
    };
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const log = t1;
  let t2;
  if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = () => {
      log();
    };
    $[2] = t2;
  } else {
    t2 = $[2];
  }
  const onClick = t2;

  identity(object);
  let t3;
  if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
    t3 = <div onClick={onClick} />;
    $[3] = t3;
  } else {
    t3 = $[3];
  }
  return t3;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) <div></div>