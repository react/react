
## Input

```javascript
import {
  useEffect,
  useRef,
  // @ts-expect-error
  experimental_useEffectEvent as useEffectEvent,
} from 'react';

let id = 0;
function uniqueId() {
  'use no memo';
  return id++;
}

export function useCustomHook(src: string): void {
  const uidRef = useRef(uniqueId());
  const destroyed = useRef(false);
  const getItem = (srcName, uid) => {
    return {srcName, uid};
  };

  const getItemEvent = useEffectEvent(() => {
    if (destroyed.current) return;

    getItem(src, uidRef.current);
  });

  useEffect(() => {
    destroyed.current = false;
    getItemEvent();
  }, []);
}

function Component() {
  useCustomHook('hello');
  return <div>Hello</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  isComponent: true,
  params: [{x: 1}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import {
  useEffect,
  useRef,
  // @ts-expect-error
  experimental_useEffectEvent as useEffectEvent,
} from "react";

let id = 0;
function uniqueId() {
  "use no memo";
  return id++;
}

export function useCustomHook(src) {
  const $ = _c(6);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = uniqueId();
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const uidRef = useRef(t0);
  const destroyed = useRef(false);
  const getItem = _temp;
  let t1;
  if ($[1] !== src) {
    t1 = () => {
      if (destroyed.current) {
        return;
      }

      getItem(src, uidRef.current);
    };
    $[1] = src;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  const getItemEvent = useEffectEvent(t1);
  let t2;
  if ($[3] !== getItemEvent) {
    t2 = () => {
      destroyed.current = false;
      getItemEvent();
    };
    $[3] = getItemEvent;
    $[4] = t2;
  } else {
    t2 = $[4];
  }
  let t3;
  if ($[5] === Symbol.for("react.memo_cache_sentinel")) {
    t3 = [];
    $[5] = t3;
  } else {
    t3 = $[5];
  }
  useEffect(t2, t3);
}
function _temp(srcName, uid) {
  return { srcName, uid };
}

function Component() {
  const $ = _c(1);
  useCustomHook("hello");
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = <div>Hello</div>;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  isComponent: true,
  params: [{ x: 1 }],
};

```
      
### Eval output
(kind: ok) <div>Hello</div>