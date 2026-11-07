
## Input

```javascript
// @validateRefAccessDuringRender
import {useRef} from 'react';

function useObserver() {
  const ref = useRef(null);
  return new ResizeObserver(() => ref.current);
}

function useObserverWithOptions(
  target: Element,
  box: ResizeObserverBoxOptions,
) {
  const ref = useRef(null);
  // The options object belongs to `observe`, not to the constructor.
  const observer = new ResizeObserver(() => ref.current);
  observer.observe(target, {box});
  return observer;
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
    t0 = new ResizeObserver(() => ref.current);
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

function useObserverWithOptions(target, box) {
  const $ = _c(4);

  const ref = useRef(null);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = () => ref.current;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  let observer;
  if ($[1] !== box || $[2] !== target) {
    observer = new ResizeObserver(t0);
    observer.observe(target, { box });
    $[1] = box;
    $[2] = target;
    $[3] = observer;
  } else {
    observer = $[3];
  }
  return observer;
}

```
      
### Eval output
(kind: exception) Fixture not implemented