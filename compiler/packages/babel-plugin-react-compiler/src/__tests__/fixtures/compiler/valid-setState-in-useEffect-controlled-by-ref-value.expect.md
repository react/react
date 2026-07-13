
## Input

```javascript
// @validateNoSetStateInEffects @enableAllowSetStateFromRefsInEffects @loggerTestOnly @compilationMode:"infer" @outputMode:"lint"
import {useState, useRef, useEffect} from 'react';

function Component({x, y}) {
  const previousXRef = useRef(null);
  const previousYRef = useRef(null);

  const [data, setData] = useState(null);

  useEffect(() => {
    const previousX = previousXRef.current;
    previousXRef.current = x;
    const previousY = previousYRef.current;
    previousYRef.current = y;
    if (!areEqual(x, previousX) || !areEqual(y, previousY)) {
      const data = load({x, y});
      setData(data);
    }
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
// @validateNoSetStateInEffects @enableAllowSetStateFromRefsInEffects @loggerTestOnly @compilationMode:"infer" @outputMode:"lint"
import { useState, useRef, useEffect } from "react";

function Component({ x, y }) {
  const previousXRef = useRef(null);
  const previousYRef = useRef(null);

  const [data, setData] = useState(null);

  useEffect(() => {
    const previousX = previousXRef.current;
    previousXRef.current = x;
    const previousY = previousYRef.current;
    previousYRef.current = y;
    if (!areEqual(x, previousX) || !areEqual(y, previousY)) {
      const data_0 = load({ x, y });
      setData(data_0);
    }
  }, [x, y]);

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
{"kind":"CompileSuccess","fnLoc":{"start":{"line":4,"column":0,"index":182},"end":{"line":22,"column":1,"index":650},"filename":"valid-setState-in-useEffect-controlled-by-ref-value.ts"},"fnName":"Component","memoSlots":4,"memoBlocks":1,"memoValues":2,"prunedMemoBlocks":0,"prunedMemoValues":0}
```
      
### Eval output
(kind: ok) 0
0
1