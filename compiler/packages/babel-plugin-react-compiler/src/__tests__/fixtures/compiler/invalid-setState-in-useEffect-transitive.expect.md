
## Input

```javascript
// @loggerTestOnly @validateNoSetStateInEffects @outputMode:"lint"
import {useEffect, useState} from 'react';

function Component() {
  const [state, setState] = useState(0);
  const f = () => {
    setState(s => s + 1);
  };
  const g = () => {
    f();
  };
  useEffect(() => {
    g();
  });
  return state;
}

```

## Code

```javascript
// @loggerTestOnly @validateNoSetStateInEffects @outputMode:"lint"
import { useEffect, useState } from "react";

function Component() {
  const [state, setState] = useState(0);
  const f = () => {
    setState((s) => s + 1);
  };
  const g = () => {
    f();
  };
  useEffect(() => {
    g();
  });
  return state;
}

```

## Logs

```
{"kind":"CompileError","detail":{"category":"EffectSetState","reason":"Calling setState synchronously within an effect can trigger cascading renders","description":"Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:\n* Update external systems with the latest state from React.\n* Subscribe for updates from some external system, calling setState in a callback function when external state changes.\n\nCalling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect)","severity":"Error","suggestions":null,"details":[{"kind":"error","loc":{"start":{"line":13,"column":4,"index":284},"end":{"line":13,"column":5,"index":285},"filename":"invalid-setState-in-useEffect-transitive.ts","identifierName":"g"},"message":"Avoid calling setState() directly within an effect"}]},"fnLoc":null}
{"kind":"CompileSuccess","fnLoc":{"start":{"line":4,"column":0,"index":111},"end":{"line":16,"column":1,"index":312},"filename":"invalid-setState-in-useEffect-transitive.ts"},"fnName":"Component","memoSlots":2,"memoBlocks":2,"memoValues":2,"prunedMemoBlocks":0,"prunedMemoValues":0}
```
      
### Eval output
(kind: exception) Fixture not implemented