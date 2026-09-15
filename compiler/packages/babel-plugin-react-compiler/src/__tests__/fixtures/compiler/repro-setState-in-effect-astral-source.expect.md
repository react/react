
## Input

```javascript
// @loggerTestOnly @validateNoSetStateInEffects @outputMode:"lint"
import {useEffect, useState} from 'react';

export function useThing({paused}) {
  const [count, setCount] = useState(0);
  // 🎉🎉 surrogate pairs: len_utf16() == 2 but len_utf8() == 4 per character
  useEffect(() => {
    setCount(1);
  }, [paused]);
  return count;
}

```

## Code

```javascript
// @loggerTestOnly @validateNoSetStateInEffects @outputMode:"lint"
import { useEffect, useState } from "react";

export function useThing({ paused }) {
  const [count, setCount] = useState(0);
  // 🎉🎉 surrogate pairs: len_utf16() == 2 but len_utf8() == 4 per character
  useEffect(() => {
    setCount(1);
  }, [paused]);
  return count;
}

```

## Logs

```
{"kind":"CompileError","detail":{"category":"EffectSetState","reason":"Calling setState synchronously within an effect can trigger cascading renders","description":"Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:\n* Update external systems with the latest state from React.\n* Subscribe for updates from some external system, calling setState in a callback function when external state changes.\n\nCalling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect)","severity":"Error","suggestions":null,"details":[{"kind":"error","loc":{"start":{"line":8,"column":4,"index":291},"end":{"line":8,"column":12,"index":299},"filename":"repro-setState-in-effect-astral-source.ts","identifierName":"setCount"},"message":"Avoid calling setState() directly within an effect"}]},"fnLoc":null}
{"kind":"CompileSuccess","fnLoc":{"start":{"line":4,"column":7,"index":118},"end":{"line":11,"column":1,"index":337},"filename":"repro-setState-in-effect-astral-source.ts"},"fnName":"useThing","memoSlots":3,"memoBlocks":2,"memoValues":2,"prunedMemoBlocks":0,"prunedMemoValues":0}
```
      
### Eval output
(kind: exception) Fixture not implemented