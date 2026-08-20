
## Input

```javascript
// @flow @validateRefAccessDuringRender @validatePreserveExistingMemoizationGuarantees
import {useCallback, useRef} from 'react';

component Foo() {
  const ref = useRef();

  const s = useCallback(() => {
    return ref.current;
  });

  return <A r={s} />;
}

component A(r: mixed) {
  return <div />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useCallback, useRef } from "react";

function Foo() {
  const $ = _c(2);
  const ref = useRef();
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = () => ref.current;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const s = t0;
  let t1;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = <A r={s} />;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

function A(t0) {
  const $ = _c(1);
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = <div />;
    $[0] = t1;
  } else {
    t1 = $[0];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [],
};

```
      
### Eval output
(kind: ok) <div></div>