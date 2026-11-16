
## Input

```javascript
// @validateRefAccessDuringRender
import {useRef} from 'react';

function useObserver() {
  const ref = useRef(null);
  return new IntersectionObserver(() => ref.current);
}

function useObserverWithOptions(options: Partial<IntersectionObserverInit>) {
  const ref = useRef(null);
  return new IntersectionObserver(() => ref.current, options);
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateRefAccessDuringRender
import { useRef } from "react";

function useObserver() {
  const $ = _c(1);
  const ref = useRef(null);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = new IntersectionObserver(() => ref.current);
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

function useObserverWithOptions(options) {
  const $ = _c(3);
  const ref = useRef(null);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = () => ref.current;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  let t1;
  if ($[1] !== options) {
    t1 = new IntersectionObserver(t0, options);
    $[1] = options;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  return t1;
}

```
      
### Eval output
(kind: exception) Fixture not implemented