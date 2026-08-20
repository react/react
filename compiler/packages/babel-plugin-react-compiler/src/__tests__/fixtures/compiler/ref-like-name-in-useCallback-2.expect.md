
## Input

```javascript
// @enableTreatRefLikeIdentifiersAsRefs @validatePreserveExistingMemoizationGuarantees
import {useRef, useCallback} from 'react';

function useCustomRef() {
  return useRef({click: () => {}});
}

function Foo() {
  const ref = useCustomRef();

  const onClick = useCallback(() => {
    ref.current?.click();
  }, [ref]);

  return <button onClick={onClick} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [],
  isComponent: true,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enableTreatRefLikeIdentifiersAsRefs @validatePreserveExistingMemoizationGuarantees
import { useRef, useCallback } from "react";

function useCustomRef() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = { click: _temp };
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return useRef(t0);
}
function _temp() {}

function Foo() {
  const $ = _c(4);
  const ref = useCustomRef();
  let t0;
  if ($[0] !== ref) {
    t0 = () => {
      ref.current?.click();
    };
    $[0] = ref;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const onClick = t0;
  let t1;
  if ($[2] !== onClick) {
    t1 = <button onClick={onClick} />;
    $[2] = onClick;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [],
  isComponent: true,
};

```
      
### Eval output
(kind: ok) <button></button>