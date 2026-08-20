
## Input

```javascript
// @validateNoDerivedComputationsInEffects_exp @loggerTestOnly @outputMode:"lint"
import {useEffect, useState} from 'react';

function Component({propValue, onChange}) {
  const [value, setValue] = useState(null);
  useEffect(() => {
    setValue(propValue);
    onChange();
  }, [propValue]);

  return <div>{value}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{propValue: 'test', onChange: () => {}}],
};

```

## Code

```javascript
// @validateNoDerivedComputationsInEffects_exp @loggerTestOnly @outputMode:"lint"
import { useEffect, useState } from "react";

function Component({ propValue, onChange }) {
  const [value, setValue] = useState(null);
  useEffect(() => {
    setValue(propValue);
    onChange();
  }, [propValue]);

  return <div>{value}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ propValue: "test", onChange: () => {} }],
};

```

## Logs

```
{"kind":"CompileSuccess","fnLoc":{"start":{"line":4,"column":0,"index":126},"end":{"line":12,"column":1,"index":325},"filename":"effect-contains-prop-function-call-no-error.ts"},"fnName":"Component","memoSlots":7,"memoBlocks":3,"memoValues":3,"prunedMemoBlocks":0,"prunedMemoValues":0}
{"kind":"CompileSuccess","fnLoc":{"start":{"line":16,"column":41,"index":421},"end":{"line":16,"column":49,"index":429},"filename":"effect-contains-prop-function-call-no-error.ts"},"fnName":null,"memoSlots":0,"memoBlocks":0,"memoValues":0,"prunedMemoBlocks":0,"prunedMemoValues":0}
```
      
### Eval output
(kind: ok) <div>test</div>