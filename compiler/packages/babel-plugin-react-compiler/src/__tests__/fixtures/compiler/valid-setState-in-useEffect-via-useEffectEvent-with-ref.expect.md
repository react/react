
## Input

```javascript
// @validateNoSetStateInEffects @enableAllowSetStateFromRefsInEffects @loggerTestOnly @compilationMode:"infer"
import {useState, useRef, useEffect, useEffectEvent} from 'react';

function Component({x, y}) {
  const previousXRef = useRef(null);
  const previousYRef = useRef(null);

  const [data, setData] = useState(null);

  const effectEvent = useEffectEvent(() => {
    const data = load({x, y});
    setData(data);
  });

  useEffect(() => {
    const previousX = previousXRef.current;
    previousXRef.current = x;
    const previousY = previousYRef.current;
    previousYRef.current = y;
    if (!areEqual(x, previousX) || !areEqual(y, previousY)) {
      effectEvent();
    }
  }, [x, y]);

  const effectEvent2 = useEffectEvent((xx, yy) => {
    const previousX = previousXRef.current;
    previousXRef.current = xx;
    const previousY = previousYRef.current;
    previousYRef.current = yy;
    if (!areEqual(xx, previousX) || !areEqual(yy, previousY)) {
      const data = load({x: xx, y: yy});
      setData(data);
    }
  });

  useEffect(() => {
    effectEvent2(x, y);
  }, [x, y]);

  return data;
}

function areEqual(a, b) {
  return a === b;
}

function load({x, y}) {
  return x * y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{x: 0, y: 0}],
  sequentialRenders: [
    {x: 0, y: 0},
    {x: 1, y: 0},
    {x: 1, y: 1},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateNoSetStateInEffects @enableAllowSetStateFromRefsInEffects @loggerTestOnly @compilationMode:"infer"
import { useState, useRef, useEffect, useEffectEvent } from "react";

function Component(t0) {
  const $ = _c(18);
  const { x, y } = t0;
  const previousXRef = useRef(null);
  const previousYRef = useRef(null);

  const [data, setData] = useState(null);
  let t1;
  if ($[0] !== x || $[1] !== y) {
    t1 = () => {
      const data_0 = load({ x, y });
      setData(data_0);
    };
    $[0] = x;
    $[1] = y;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  const effectEvent = useEffectEvent(t1);
  let t2;
  if ($[3] !== effectEvent || $[4] !== x || $[5] !== y) {
    t2 = () => {
      const previousX = previousXRef.current;
      previousXRef.current = x;
      const previousY = previousYRef.current;
      previousYRef.current = y;
      if (!areEqual(x, previousX) || !areEqual(y, previousY)) {
        effectEvent();
      }
    };
    $[3] = effectEvent;
    $[4] = x;
    $[5] = y;
    $[6] = t2;
  } else {
    t2 = $[6];
  }
  let t3;
  if ($[7] !== x || $[8] !== y) {
    t3 = [x, y];
    $[7] = x;
    $[8] = y;
    $[9] = t3;
  } else {
    t3 = $[9];
  }
  useEffect(t2, t3);
  let t4;
  if ($[10] === Symbol.for("react.memo_cache_sentinel")) {
    t4 = (xx, yy) => {
      const previousX_0 = previousXRef.current;
      previousXRef.current = xx;
      const previousY_0 = previousYRef.current;
      previousYRef.current = yy;
      if (!areEqual(xx, previousX_0) || !areEqual(yy, previousY_0)) {
        const data_1 = load({ x: xx, y: yy });
        setData(data_1);
      }
    };
    $[10] = t4;
  } else {
    t4 = $[10];
  }
  const effectEvent2 = useEffectEvent(t4);
  let t5;
  if ($[11] !== effectEvent2 || $[12] !== x || $[13] !== y) {
    t5 = () => {
      effectEvent2(x, y);
    };
    $[11] = effectEvent2;
    $[12] = x;
    $[13] = y;
    $[14] = t5;
  } else {
    t5 = $[14];
  }
  let t6;
  if ($[15] !== x || $[16] !== y) {
    t6 = [x, y];
    $[15] = x;
    $[16] = y;
    $[17] = t6;
  } else {
    t6 = $[17];
  }
  useEffect(t5, t6);

  return data;
}

function areEqual(a, b) {
  return a === b;
}

function load({ x, y }) {
  return x * y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ x: 0, y: 0 }],
  sequentialRenders: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
  ],
};

```

## Logs

```
{"kind":"CompileSuccess","fnLoc":{"start":{"line":4,"column":0,"index":179},"end":{"line":41,"column":1,"index":1116},"filename":"valid-setState-in-useEffect-via-useEffectEvent-with-ref.ts"},"fnName":"Component","memoSlots":18,"memoBlocks":6,"memoValues":6,"prunedMemoBlocks":0,"prunedMemoValues":0}
```
      
### Eval output
(kind: ok) [[ (exception in render) TypeError: (0 , _react.useEffectEvent) is not a function ]]
[[ (exception in render) TypeError: (0 , _react.useEffectEvent) is not a function ]]
[[ (exception in render) TypeError: (0 , _react.useEffectEvent) is not a function ]]