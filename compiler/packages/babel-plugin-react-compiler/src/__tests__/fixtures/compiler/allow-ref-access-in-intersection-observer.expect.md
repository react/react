
## Input

```javascript
// @validateRefAccessDuringRender
import {useCallback, useMemo, useRef} from 'react';

type IntersectionCallback = (isIntersecting: boolean) => void;

function useIntersectionObserver(options: Partial<IntersectionObserverInit>) {
  const callbacks = useRef(new Map<string, IntersectionCallback>());

  const onIntersect = useCallback(
    (entries: ReadonlyArray<IntersectionObserverEntry>) => {
      entries.forEach(entry =>
        callbacks.current.get(entry.target.id)?.(entry.isIntersecting),
      );
    },
    [],
  );

  return useMemo(
    () => new IntersectionObserver(onIntersect, options),
    [onIntersect, options],
  );
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateRefAccessDuringRender
import { useCallback, useMemo, useRef } from "react";

type IntersectionCallback = (isIntersecting: boolean) => void;

function useIntersectionObserver(options) {
  const $ = _c(4);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = new Map();
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const callbacks = useRef(t0);
  let t1;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = (entries) => {
      entries.forEach((entry) =>
        callbacks.current.get(entry.target.id)?.(entry.isIntersecting),
      );
    };
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const onIntersect = t1;
  let t2;
  if ($[2] !== options) {
    t2 = new IntersectionObserver(onIntersect, options);
    $[2] = options;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  return t2;
}

```
      
### Eval output
(kind: exception) Fixture not implemented