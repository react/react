
## Input

```javascript
// @validateNoDerivedComputationsInEffects_exp @loggerTestOnly @outputMode:"lint"
import {useEffect, useState} from 'react';

function Component({firstName}) {
  const [lastName, setLastName] = useState('Doe');
  const [fullName, setFullName] = useState('John');

  const middleName = 'D.';

  useEffect(() => {
    setFullName(firstName + ' ' + middleName + ' ' + lastName);
  }, [firstName, middleName, lastName]);

  return (
    <div>
      <input value={lastName} onChange={e => setLastName(e.target.value)} />
      <div>{fullName}</div>
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{firstName: 'John'}],
};

```

## Code

```javascript
// @validateNoDerivedComputationsInEffects_exp @loggerTestOnly @outputMode:"lint"
import { useEffect, useState } from "react";

function Component({ firstName }) {
  const [lastName, setLastName] = useState("Doe");
  const [fullName, setFullName] = useState("John");

  const middleName = "D.";

  useEffect(() => {
    setFullName(firstName + " " + middleName + " " + lastName);
  }, [firstName, middleName, lastName]);

  return (
    <div>
      <input value={lastName} onChange={(e) => setLastName(e.target.value)} />
      <div>{fullName}</div>
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ firstName: "John" }],
};

```

## Logs

```
{"kind":"CompileError","detail":{"category":"EffectDerivationsOfState","reason":"You might not need an effect. Derive values in render, not effects.","description":"Using an effect triggers an additional render which can hurt performance and user experience, potentially briefly showing stale values to the user\n\nThis setState call is setting a derived value that depends on the following reactive sources:\n\nProps: [firstName]\nState: [lastName]\n\nData Flow Tree:\n├── firstName (Prop)\n└── lastName (State)\n\nSee: https://react.dev/learn/you-might-not-need-an-effect#updating-state-based-on-props-or-state","severity":"Error","suggestions":null,"details":[{"kind":"error","loc":{"start":{"line":11,"column":4,"index":316},"end":{"line":11,"column":15,"index":327},"filename":"derived-state-from-prop-local-state-and-component-scope.ts","identifierName":"setFullName"},"message":"This should be computed during render, not in an effect"}]},"fnLoc":null}
{"kind":"CompileSuccess","fnLoc":{"start":{"line":4,"column":0,"index":126},"end":{"line":20,"column":1,"index":561},"filename":"derived-state-from-prop-local-state-and-component-scope.ts"},"fnName":"Component","memoSlots":12,"memoBlocks":5,"memoValues":6,"prunedMemoBlocks":0,"prunedMemoValues":0}
```
      
### Eval output
(kind: ok) <div><input value="Doe"><div>John D. Doe</div></div>