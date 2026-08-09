
## Input

```javascript
// @loggerTestOnly @validateNoSetStateInEffects @outputMode:"lint"
import {useEffect, useState} from 'react';

// Bug: NewExpression default param value should not prevent set-state-in-effect validation
function Component({value = new Number()}) {
  const [state, setState] = useState(0);
  useEffect(() => {
    setState(s => s + 1);
  });
  return state;
}

```

## Code

```javascript
// @loggerTestOnly @validateNoSetStateInEffects @outputMode:"lint"
import { useEffect, useState } from "react";

// Bug: NewExpression default param value should not prevent set-state-in-effect validation
function Component({ value = new Number() }) {
  const [state, setState] = useState(0);
  useEffect(() => {
    setState((s) => s + 1);
  });
  return state;
}

```

## Logs

```
{"kind":"CompileError","detail":{"category":"EffectSetState","reason":"Calling setState synchronously within an effect can trigger cascading renders","description":"Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:\n* Update external systems with the latest state from React.\n* Subscribe for updates from some external system, calling setState in a callback function when external state changes.\n\nCalling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect)","severity":"Error","suggestions":null,"details":[{"kind":"error","loc":{"start":{"line":8,"column":4,"index":313},"end":{"line":8,"column":12,"index":321},"filename":"invalid-setState-in-useEffect-new-expression-default-param.ts","identifierName":"setState"},"message":"Avoid calling setState() directly within an effect"}]},"fnLoc":null}
{"kind":"CompileSuccess","fnLoc":{"start":{"line":5,"column":0,"index":203},"end":{"line":11,"column":1,"index":358},"filename":"invalid-setState-in-useEffect-new-expression-default-param.ts"},"fnName":"Component","memoSlots":1,"memoBlocks":1,"memoValues":1,"prunedMemoBlocks":1,"prunedMemoValues":0}
```
      
### Eval output
(kind: exception) Fixture not implemented