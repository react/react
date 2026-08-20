
## Input

```javascript
import {useCallback, useRef} from 'react';

// Identical to useCallback-set-ref-nested-property-preserve-memoization,
// but with a different set of compiler flags
function Component({}) {
  const ref = useRef({inner: null});

  const onChange = useCallback(event => {
    // The ref should still be mutable here even though function deps are frozen in
    // @enablePreserveExistingMemoizationGuarantees mode
    ref.current.inner = event.target.value;
  });

  return <input onChange={onChange} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useCallback, useRef } from "react";

// Identical to useCallback-set-ref-nested-property-preserve-memoization,
// but with a different set of compiler flags
function Component(t0) {
  const $ = _c(3);
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = { inner: null };
    $[0] = t1;
  } else {
    t1 = $[0];
  }
  const ref = useRef(t1);
  let t2;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = (event) => {
      ref.current.inner = event.target.value;
    };
    $[1] = t2;
  } else {
    t2 = $[1];
  }
  const onChange = t2;
  let t3;
  if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
    t3 = <input onChange={onChange} />;
    $[2] = t3;
  } else {
    t3 = $[2];
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