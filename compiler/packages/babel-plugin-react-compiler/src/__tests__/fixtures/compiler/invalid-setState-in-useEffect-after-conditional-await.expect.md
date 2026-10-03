
## Input

```javascript
// @loggerTestOnly @validateNoSetStateInEffects @outputMode:"lint"
import {useEffect, useState} from 'react';

function Component({delay}) {
  const [ready, setReady] = useState(false);
  const load = async () => {
    if (delay) {
      await Promise.resolve();
    }
    // The path where `delay` is false reaches this setState without passing an
    // await, so it can still execute synchronously within the effect: flag it.
    setReady(true);
  };
  useEffect(() => {
    load();
  }, [load]);
  return ready ? 'Ready' : 'Loading';
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{delay: false}],
};

```

## Code

```javascript
// @loggerTestOnly @validateNoSetStateInEffects @outputMode:"lint"
import { useEffect, useState } from "react";

function Component({ delay }) {
  const [ready, setReady] = useState(false);
  const load = async () => {
    if (delay) {
      await Promise.resolve();
    }
    // The path where `delay` is false reaches this setState without passing an
    // await, so it can still execute synchronously within the effect: flag it.
    setReady(true);
  };
  useEffect(() => {
    load();
  }, [load]);
  return ready ? "Ready" : "Loading";
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ delay: false }],
};

```

## Logs

```
{"kind":"CompileError","detail":{"category":"EffectSetState","reason":"Calling setState synchronously within an effect can trigger cascading renders","description":"Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:\n* Update external systems with the latest state from React.\n* Subscribe for updates from some external system, calling setState in a callback function when external state changes.\n\nCalling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect)","severity":"Error","suggestions":null,"details":[{"kind":"error","loc":{"start":{"line":15,"column":4,"index":478},"end":{"line":15,"column":8,"index":482},"filename":"invalid-setState-in-useEffect-after-conditional-await.ts","identifierName":"load"},"message":"Avoid calling setState() directly within an effect"}]},"fnLoc":null}
{"kind":"CompileSuccess","fnLoc":{"start":{"line":4,"column":0,"index":111},"end":{"line":18,"column":1,"index":539},"filename":"invalid-setState-in-useEffect-after-conditional-await.ts"},"fnName":"Component","memoSlots":5,"memoBlocks":2,"memoValues":3,"prunedMemoBlocks":0,"prunedMemoValues":0}
```
      
### Eval output
(kind: ok) "Ready"