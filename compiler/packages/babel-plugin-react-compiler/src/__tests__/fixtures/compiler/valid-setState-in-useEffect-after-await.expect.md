
## Input

```javascript
// @loggerTestOnly @validateNoSetStateInEffects @outputMode:"lint"
import {useEffect, useState} from 'react';

function Component({id}) {
  const [state, setState] = useState(0);
  useEffect(async () => {
    await fetchData(id);
    setState(s => s + 1);
  }, [id]);
  return state;
}

```

## Code

```javascript
// @loggerTestOnly @validateNoSetStateInEffects @outputMode:"lint"
import { useEffect, useState } from "react";

function Component({ id }) {
  const [state, setState] = useState(0);
  useEffect(async () => {
    await fetchData(id);
    setState((s) => s + 1);
  }, [id]);
  return state;
}

```

## Logs

```
{"kind":"CompileSuccess","fnLoc":{"start":{"line":4,"column":0,"index":111},"end":{"line":11,"column":1,"index":285},"filename":"valid-setState-in-useEffect-after-await.ts"},"fnName":"Component","memoSlots":3,"memoBlocks":1,"memoValues":2,"prunedMemoBlocks":0,"prunedMemoValues":0}
```
      
### Eval output
(kind: exception) Fixture not implemented