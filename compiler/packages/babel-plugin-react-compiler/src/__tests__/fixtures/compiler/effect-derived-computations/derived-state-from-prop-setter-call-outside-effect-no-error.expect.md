
## Input

```javascript
// @validateNoDerivedComputationsInEffects_exp @loggerTestOnly @outputMode:"lint"
import {useEffect, useState} from 'react';

function Component({initialName}) {
  const [name, setName] = useState('');

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  return (
    <div>
      <input value={name} onChange={e => setName(e.target.value)} />
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{initialName: 'John'}],
};

```

## Code

```javascript
// @validateNoDerivedComputationsInEffects_exp @loggerTestOnly @outputMode:"lint"
import { useEffect, useState } from "react";

function Component({ initialName }) {
  const [name, setName] = useState("");

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  return (
    <div>
      <input value={name} onChange={(e) => setName(e.target.value)} />
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ initialName: "John" }],
};

```

## Logs

```
{"kind":"CompileSuccess","fnLoc":{"start":{"line":4,"column":0,"index":126},"end":{"line":16,"column":1,"index":378},"filename":"derived-state-from-prop-setter-call-outside-effect-no-error.ts"},"fnName":"Component","memoSlots":6,"memoBlocks":3,"memoValues":4,"prunedMemoBlocks":0,"prunedMemoValues":0}
```
      
### Eval output
(kind: ok) <div><input value="John"></div>