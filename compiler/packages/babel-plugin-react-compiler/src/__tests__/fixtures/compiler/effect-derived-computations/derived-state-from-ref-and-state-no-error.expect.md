
## Input

```javascript
// @validateNoDerivedComputationsInEffects_exp @loggerTestOnly @outputMode:"lint"
import {useEffect, useState, useRef} from 'react';

export default function Component({test}) {
  const [local, setLocal] = useState('');

  const myRef = useRef(null);

  useEffect(() => {
    setLocal(myRef.current + test);
  }, [test]);

  return <>{local}</>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{test: 'testString'}],
};

```

## Code

```javascript
// @validateNoDerivedComputationsInEffects_exp @loggerTestOnly @outputMode:"lint"
import { useEffect, useState, useRef } from "react";

export default function Component({ test }) {
  const [local, setLocal] = useState("");

  const myRef = useRef(null);

  useEffect(() => {
    setLocal(myRef.current + test);
  }, [test]);

  return <>{local}</>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ test: "testString" }],
};

```

## Logs

```
{"kind":"CompileSuccess","fnLoc":{"start":{"line":4,"column":15,"index":149},"end":{"line":14,"column":1,"index":347},"filename":"derived-state-from-ref-and-state-no-error.ts"},"fnName":"Component","memoSlots":5,"memoBlocks":2,"memoValues":3,"prunedMemoBlocks":0,"prunedMemoValues":0}
```
      
### Eval output
(kind: ok) nulltestString