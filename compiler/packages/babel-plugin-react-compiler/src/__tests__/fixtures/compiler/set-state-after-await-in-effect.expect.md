
## Input

```javascript
// @loggerTestOnly @validateNoSetStateInEffects @outputMode:"lint"
import {useEffect, useState} from 'react';

function Component() {
  const [ready, setReady] = useState(false);
  const load = async () => {
    await Promise.resolve();
    setReady(true);
  };
  useEffect(() => {
    load();
  }, [load]);
  return ready ? 'Ready' : 'Loading';
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```

## Code

```javascript
// @loggerTestOnly @validateNoSetStateInEffects @outputMode:"lint"
import { useEffect, useState } from "react";

function Component() {
  const [ready, setReady] = useState(false);
  const load = async () => {
    await Promise.resolve();
    setReady(true);
  };
  useEffect(() => {
    load();
  }, [load]);
  return ready ? "Ready" : "Loading";
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```

## Logs

```
{"kind":"CompileSuccess","fnLoc":{"start":{"line":4,"column":0,"index":111},"end":{"line":14,"column":1,"index":347},"filename":"set-state-after-await-in-effect.ts"},"fnName":"Component","memoSlots":3,"memoBlocks":2,"memoValues":3,"prunedMemoBlocks":0,"prunedMemoValues":0}
```
      
### Eval output
(kind: ok) "Loading"