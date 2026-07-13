
## Input

```javascript
// @loggerTestOnly @validateNoSetStateInEffects @outputMode:"lint"
import * as React from 'react';

function Component() {
  const [state, setState] = React.useState(0);
  React.useEffect(() => {
    setState(s => s + 1);
  });
  return state;
}

```

## Code

```javascript
// @loggerTestOnly @validateNoSetStateInEffects @outputMode:"lint"
import * as React from "react";

function Component() {
  const [state, setState] = React.useState(0);
  React.useEffect(() => {
    setState((s) => s + 1);
  });
  return state;
}

```

## Logs

```
{"kind":"CompileError","detail":{"category":"EffectSetState","reason":"Calling setState synchronously within an effect can trigger cascading renders","description":"Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:\n* Update external systems with the latest state from React.\n* Subscribe for updates from some external system, calling setState in a callback function when external state changes.\n\nCalling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect)","severity":"Error","suggestions":null,"details":[{"kind":"error","loc":{"start":{"line":7,"column":4,"index":200},"end":{"line":7,"column":12,"index":208},"filename":"invalid-setState-in-useEffect-namespace.ts","identifierName":"setState"},"message":"Avoid calling setState() directly within an effect"}]},"fnLoc":null}
{"kind":"CompileSuccess","fnLoc":{"start":{"line":4,"column":0,"index":100},"end":{"line":10,"column":1,"index":245},"filename":"invalid-setState-in-useEffect-namespace.ts"},"fnName":"Component","memoSlots":1,"memoBlocks":1,"memoValues":1,"prunedMemoBlocks":1,"prunedMemoValues":1}
```
      
### Eval output
(kind: exception) Fixture not implemented