
## Input

```javascript
// @validateNoDerivedComputationsInEffects_exp @loggerTestOnly @outputMode:"lint"
import {useEffect, useState} from 'react';

function MockComponent({onSet}) {
  return <div onClick={() => onSet('clicked')}>Mock Component</div>;
}

function Component({propValue}) {
  const [value, setValue] = useState(null);
  useEffect(() => {
    setValue(propValue);
  }, [propValue]);

  return <MockComponent onSet={setValue} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{propValue: 'test'}],
};

```

## Code

```javascript
// @validateNoDerivedComputationsInEffects_exp @loggerTestOnly @outputMode:"lint"
import { useEffect, useState } from "react";

function MockComponent({ onSet }) {
  return <div onClick={() => onSet("clicked")}>Mock Component</div>;
}

function Component({ propValue }) {
  const [value, setValue] = useState(null);
  useEffect(() => {
    setValue(propValue);
  }, [propValue]);

  return <MockComponent onSet={setValue} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ propValue: "test" }],
};

```

## Logs

```
{"kind":"CompileSuccess","fnLoc":{"start":{"line":4,"column":0,"index":126},"end":{"line":6,"column":1,"index":230},"filename":"derived-state-from-prop-setter-used-outside-effect-no-error.ts"},"fnName":"MockComponent","memoSlots":2,"memoBlocks":1,"memoValues":1,"prunedMemoBlocks":0,"prunedMemoValues":0}
{"kind":"CompileSuccess","fnLoc":{"start":{"line":8,"column":0,"index":232},"end":{"line":15,"column":1,"index":421},"filename":"derived-state-from-prop-setter-used-outside-effect-no-error.ts"},"fnName":"Component","memoSlots":4,"memoBlocks":2,"memoValues":3,"prunedMemoBlocks":0,"prunedMemoValues":0}
```
      
### Eval output
(kind: ok) <div>Mock Component</div>