
## Input

```javascript
// @validateRefAccessDuringRender
import {useRef} from 'react';

function usePerformanceLogger() {
  const ref = useRef(null);
  return new PerformanceObserver(() => {
    ref.current = performance.now();
  });
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateRefAccessDuringRender
import { useRef } from "react";

function usePerformanceLogger() {
  const $ = _c(1);
  const ref = useRef(null);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = new PerformanceObserver(() => {
      ref.current = performance.now();
    });
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

```
      
### Eval output
(kind: exception) Fixture not implemented