
## Input

```javascript
// @validateRefAccessDuringRender
import {useRef} from 'react';

function useIntersectionObserver(options) {
  const ref = useRef(false);
  return new IntersectionObserver(entries => {
    ref.current = entries.some(entry => entry.isIntersecting);
  }, options);
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateRefAccessDuringRender
import { useRef } from "react";

function useIntersectionObserver(options) {
  const $ = _c(3);
  const ref = useRef(false);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = (entries) => {
      ref.current = entries.some(_temp);
    };
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
function _temp(entry) {
  return entry.isIntersecting;
}

```
      
### Eval output
(kind: exception) Fixture not implemented