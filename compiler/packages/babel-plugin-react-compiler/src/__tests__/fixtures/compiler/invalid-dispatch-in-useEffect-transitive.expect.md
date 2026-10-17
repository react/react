
## Input

```javascript
// @loggerTestOnly @validateNoSetStateInEffects @outputMode:"lint"
import {useEffect, useReducer} from 'react';

function reducer(state, action) {
  return action.type === 'inc' ? state + 1 : state;
}

function Component() {
  const [state, dispatch] = useReducer(reducer, 0);
  const increment = () => {
    dispatch({type: 'inc'});
  };
  useEffect(() => {
    increment();
  });
  return state;
}

```

## Code

```javascript
// @loggerTestOnly @validateNoSetStateInEffects @outputMode:"lint"
import { useEffect, useReducer } from "react";

function reducer(state, action) {
  return action.type === "inc" ? state + 1 : state;
}

function Component() {
  const [state, dispatch] = useReducer(reducer, 0);
  const increment = () => {
    dispatch({ type: "inc" });
  };
  useEffect(() => {
    increment();
  });
  return state;
}

```

## Logs

```
{"kind":"CompileSuccess","fnLoc":{"start":{"line":4,"column":0,"index":113},"end":{"line":6,"column":1,"index":200},"filename":"invalid-dispatch-in-useEffect-transitive.ts"},"fnName":"reducer","memoSlots":0,"memoBlocks":0,"memoValues":0,"prunedMemoBlocks":0,"prunedMemoValues":0}
{"kind":"CompileError","detail":{"category":"EffectSetState","reason":"Calling setState synchronously within an effect can trigger cascading renders","description":"Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:\n* Update external systems with the latest state from React.\n* Subscribe for updates from some external system, calling setState in a callback function when external state changes.\n\nCalling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect)","severity":"Error","suggestions":null,"details":[{"kind":"error","loc":{"start":{"line":14,"column":4,"index":363},"end":{"line":14,"column":13,"index":372},"filename":"invalid-dispatch-in-useEffect-transitive.ts","identifierName":"increment"},"message":"Avoid calling setState() directly within an effect"}]},"fnLoc":null}
{"kind":"CompileSuccess","fnLoc":{"start":{"line":8,"column":0,"index":202},"end":{"line":17,"column":1,"index":399},"filename":"invalid-dispatch-in-useEffect-transitive.ts"},"fnName":"Component","memoSlots":2,"memoBlocks":2,"memoValues":2,"prunedMemoBlocks":0,"prunedMemoValues":0}
```
      
### Eval output
(kind: exception) Fixture not implemented