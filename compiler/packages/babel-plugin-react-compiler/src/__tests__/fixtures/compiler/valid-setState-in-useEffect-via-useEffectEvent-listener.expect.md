
## Input

```javascript
// @validateNoSetStateInEffects @loggerTestOnly @compilationMode:"infer"
import {useEffect, useEffectEvent, useState} from 'react';

const shouldSetState = false;

function Component() {
  const [state, setState] = useState(0);
  const effectEvent = useEffectEvent(() => {
    setState(10);
  });
  useEffect(() => {
    setTimeout(effectEvent, 10);
  });

  const effectEventWithTimeout = useEffectEvent(() => {
    setTimeout(() => {
      setState(20);
    }, 10);
  });
  useEffect(() => {
    effectEventWithTimeout();
  }, []);
  return state;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateNoSetStateInEffects @loggerTestOnly @compilationMode:"infer"
import { useEffect, useEffectEvent, useState } from "react";

const shouldSetState = false;

function Component() {
  const $ = _c(7);
  const [state, setState] = useState(0);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = () => {
      setState(10);
    };
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const effectEvent = useEffectEvent(t0);
  let t1;
  if ($[1] !== effectEvent) {
    t1 = () => {
      setTimeout(effectEvent, 10);
    };
    $[1] = effectEvent;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  useEffect(t1);
  let t2;
  if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = () => {
      setTimeout(() => {
        setState(20);
      }, 10);
    };
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  const effectEventWithTimeout = useEffectEvent(t2);
  let t3;
  if ($[4] !== effectEventWithTimeout) {
    t3 = () => {
      effectEventWithTimeout();
    };
    $[4] = effectEventWithTimeout;
    $[5] = t3;
  } else {
    t3 = $[5];
  }
  let t4;
  if ($[6] === Symbol.for("react.memo_cache_sentinel")) {
    t4 = [];
    $[6] = t4;
  } else {
    t4 = $[6];
  }
  useEffect(t3, t4);
  return state;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Logs

```
{"kind":"CompileSuccess","fnLoc":{"start":{"line":6,"column":0,"index":164},"end":{"line":24,"column":1,"index":551},"filename":"valid-setState-in-useEffect-via-useEffectEvent-listener.ts"},"fnName":"Component","memoSlots":7,"memoBlocks":5,"memoValues":5,"prunedMemoBlocks":0,"prunedMemoValues":0}
```
      
### Eval output
(kind: exception) (0 , _react.useEffectEvent) is not a function