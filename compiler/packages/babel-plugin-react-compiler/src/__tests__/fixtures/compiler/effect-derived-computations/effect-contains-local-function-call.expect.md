
## Input

```javascript
// @validateNoDerivedComputationsInEffects_exp @loggerTestOnly @outputMode:"lint"
import {useEffect, useState} from 'react';

function Component({propValue}) {
  const [value, setValue] = useState(null);

  function localFunction() {
    console.log('local function');
  }

  useEffect(() => {
    setValue(propValue);
    localFunction();
  }, [propValue]);

  return <div>{value}</div>;
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

function Component({ propValue }) {
  const [value, setValue] = useState(null);

  function localFunction() {
    console.log("local function");
  }

  useEffect(() => {
    setValue(propValue);
    localFunction();
  }, [propValue]);

  return <div>{value}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ propValue: "test" }],
};

```

## Logs

```
{"kind":"CompileError","detail":{"category":"EffectDerivationsOfState","reason":"You might not need an effect. Derive values in render, not effects.","description":"Using an effect triggers an additional render which can hurt performance and user experience, potentially briefly showing stale values to the user\n\nThis setState call is setting a derived value that depends on the following reactive sources:\n\nProps: [propValue]\n\nData Flow Tree:\n└── propValue (Prop)\n\nSee: https://react.dev/learn/you-might-not-need-an-effect#updating-state-based-on-props-or-state","severity":"Error","suggestions":null,"details":[{"kind":"error","loc":{"start":{"line":12,"column":4,"index":298},"end":{"line":12,"column":12,"index":306},"filename":"effect-contains-local-function-call.ts","identifierName":"setValue"},"message":"This should be computed during render, not in an effect"}]},"fnLoc":null}
{"kind":"CompileSuccess","fnLoc":{"start":{"line":4,"column":0,"index":126},"end":{"line":17,"column":1,"index":390},"filename":"effect-contains-local-function-call.ts"},"fnName":"Component","memoSlots":6,"memoBlocks":3,"memoValues":4,"prunedMemoBlocks":0,"prunedMemoValues":0}
```
      
### Eval output
(kind: ok) <div>test</div>
logs: ['local function']