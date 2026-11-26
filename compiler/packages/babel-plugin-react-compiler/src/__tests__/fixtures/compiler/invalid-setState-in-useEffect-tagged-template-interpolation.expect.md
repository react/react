
## Input

```javascript
// @loggerTestOnly @validateNoSetStateInEffects @outputMode:"lint"
import {useEffect, useState} from 'react';

// Bug: tagged template interpolations should not prevent set-state-in-effect validation
function Component({color}) {
  const [state, setState] = useState(0);
  const style = css`color: ${color}`;
  useEffect(() => {
    setState(s => s + 1);
  });
  return style ?? state;
}

```

## Code

```javascript
// @loggerTestOnly @validateNoSetStateInEffects @outputMode:"lint"
import { useEffect, useState } from "react";

// Bug: tagged template interpolations should not prevent set-state-in-effect validation
function Component({ color }) {
  const [state, setState] = useState(0);
  const style = css`
    color: ${color};
  `;
  useEffect(() => {
    setState((s) => s + 1);
  });
  return style ?? state;
}

```

## Logs

```
{"kind":"CompileError","detail":{"category":"EffectSetState","reason":"Calling setState synchronously within an effect can trigger cascading renders","description":"Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:\n* Update external systems with the latest state from React.\n* Subscribe for updates from some external system, calling setState in a callback function when external state changes.\n\nCalling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect)","severity":"Error","suggestions":null,"details":[{"kind":"error","loc":{"start":{"line":9,"column":4,"index":333},"end":{"line":9,"column":12,"index":341},"filename":"invalid-setState-in-useEffect-tagged-template-interpolation.ts","identifierName":"setState"},"message":"Avoid calling setState() directly within an effect"}]},"fnLoc":null}
{"kind":"CompileSuccess","fnLoc":{"start":{"line":5,"column":0,"index":200},"end":{"line":12,"column":1,"index":387},"filename":"invalid-setState-in-useEffect-tagged-template-interpolation.ts"},"fnName":"Component","memoSlots":3,"memoBlocks":2,"memoValues":2,"prunedMemoBlocks":0,"prunedMemoValues":0}
```
      
### Eval output
(kind: exception) Fixture not implemented