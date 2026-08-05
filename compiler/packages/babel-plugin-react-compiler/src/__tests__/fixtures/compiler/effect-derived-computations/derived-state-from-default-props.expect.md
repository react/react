
## Input

```javascript
// @validateNoDerivedComputationsInEffects_exp @loggerTestOnly @outputMode:"lint"
import {useEffect, useState} from 'react';

export default function Component({input = 'empty'}) {
  const [currInput, setCurrInput] = useState(input);
  const localConst = 'local const';

  useEffect(() => {
    setCurrInput(input + localConst);
  }, [input, localConst]);

  return <div>{currInput}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{input: 'test'}],
};

```

## Code

```javascript
// @validateNoDerivedComputationsInEffects_exp @loggerTestOnly @outputMode:"lint"
import { useEffect, useState } from "react";

export default function Component({ input = "empty" }) {
  const [currInput, setCurrInput] = useState(input);
  const localConst = "local const";

  useEffect(() => {
    setCurrInput(input + localConst);
  }, [input, localConst]);

  return <div>{currInput}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ input: "test" }],
};

```

## Logs

```
{"kind":"CompileError","detail":{"category":"EffectDerivationsOfState","reason":"You might not need an effect. Derive values in render, not effects.","description":"Using an effect triggers an additional render which can hurt performance and user experience, potentially briefly showing stale values to the user\n\nThis setState call is setting a derived value that depends on the following reactive sources:\n\nProps: [input]\n\nData Flow Tree:\n└── input (Prop)\n\nSee: https://react.dev/learn/you-might-not-need-an-effect#updating-state-based-on-props-or-state","severity":"Error","suggestions":null,"details":[{"kind":"error","loc":{"start":{"line":9,"column":4,"index":295},"end":{"line":9,"column":16,"index":307},"filename":"derived-state-from-default-props.ts","identifierName":"setCurrInput"},"message":"This should be computed during render, not in an effect"}]},"fnLoc":null}
{"kind":"CompileSuccess","fnLoc":{"start":{"line":4,"column":15,"index":141},"end":{"line":13,"column":1,"index":391},"filename":"derived-state-from-default-props.ts"},"fnName":"Component","memoSlots":5,"memoBlocks":2,"memoValues":3,"prunedMemoBlocks":0,"prunedMemoValues":0}
```
      
### Eval output
(kind: ok) <div>testlocal const</div>