
## Input

```javascript
// @validateNoDerivedComputationsInEffects_exp @loggerTestOnly @outputMode:"lint"
import {useEffect, useState, useRef} from 'react';

export default function Component({test}) {
  const [local, setLocal] = useState(0);

  const myRef = useRef(null);

  useEffect(() => {
    if (myRef.current) {
      setLocal(test);
    } else {
      setLocal(test + test);
    }
  }, [test]);

  return <>{local}</>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{test: 4}],
};

```

## Code

```javascript
// @validateNoDerivedComputationsInEffects_exp @loggerTestOnly @outputMode:"lint"
import { useEffect, useState, useRef } from "react";

export default function Component({ test }) {
  const [local, setLocal] = useState(0);

  const myRef = useRef(null);

  useEffect(() => {
    if (myRef.current) {
      setLocal(test);
    } else {
      setLocal(test + test);
    }
  }, [test]);

  return <>{local}</>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ test: 4 }],
};

```

## Logs

```
{"kind":"CompileSuccess","fnLoc":{"start":{"line":4,"column":15,"index":149},"end":{"line":18,"column":1,"index":405},"filename":"ref-conditional-in-effect-no-error.ts"},"fnName":"Component","memoSlots":5,"memoBlocks":2,"memoValues":3,"prunedMemoBlocks":0,"prunedMemoValues":0}
```
      
### Eval output
(kind: ok) 8