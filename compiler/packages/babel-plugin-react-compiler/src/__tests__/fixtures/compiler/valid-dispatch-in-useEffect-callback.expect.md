
## Input

```javascript
// @loggerTestOnly @validateNoSetStateInEffects @outputMode:"lint"
import {useEffect, useReducer} from 'react';

function reducer(state, action) {
  return action.type === 'inc' ? state + 1 : state;
}

function Component({subscribe}) {
  const [state, dispatch] = useReducer(reducer, 0);
  useEffect(() => {
    // Dispatching from a callback scheduled by the effect is fine, it does
    // not cascade a render from within the effect itself.
    return subscribe(() => {
      dispatch({type: 'inc'});
    });
  }, [subscribe]);
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

function Component({ subscribe }) {
  const [state, dispatch] = useReducer(reducer, 0);
  useEffect(() => {
    // Dispatching from a callback scheduled by the effect is fine, it does
    // not cascade a render from within the effect itself.
    return subscribe(() => {
      dispatch({ type: "inc" });
    });
  }, [subscribe]);
  return state;
}

```

## Logs

```
{"kind":"CompileSuccess","fnLoc":{"start":{"line":4,"column":0,"index":113},"end":{"line":6,"column":1,"index":200},"filename":"valid-dispatch-in-useEffect-callback.ts"},"fnName":"reducer","memoSlots":0,"memoBlocks":0,"memoValues":0,"prunedMemoBlocks":0,"prunedMemoValues":0}
{"kind":"CompileSuccess","fnLoc":{"start":{"line":8,"column":0,"index":202},"end":{"line":18,"column":1,"index":547},"filename":"valid-dispatch-in-useEffect-callback.ts"},"fnName":"Component","memoSlots":3,"memoBlocks":1,"memoValues":2,"prunedMemoBlocks":0,"prunedMemoValues":0}
```
      
### Eval output
(kind: exception) Fixture not implemented