
## Input

```javascript
// @enablePreserveExistingMemoizationGuarantees
import {useCallback, useRef} from 'react';

function Component(props) {
  const ref = useRef({inner: null});

  const onChange = useCallback(event => {
    // The ref should still be mutable here even though function deps are frozen in
    // @enablePreserveExistingMemoizationGuarantees mode
    ref.current.inner = event.target.value;
  });

  const onReset = useCallback(() => {
    ref.current.inner = null;
  });

  return <input onChange={onChange} onReset={onReset} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enablePreserveExistingMemoizationGuarantees
import { useCallback, useRef } from "react";

function Component(props) {
  const $ = _c(4);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = { inner: null };
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const ref = useRef(t0);
  let t1;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = (event) => {
      ref.current.inner = event.target.value;
    };
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const onChange = t1;
  let t2;
  if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = () => {
      ref.current.inner = null;
    };
    $[2] = t2;
  } else {
    t2 = $[2];
  }
  const onReset = t2;
  let t3;
  if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
    t3 = <input onChange={onChange} onReset={onReset} />;
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
(kind: ok) <input>