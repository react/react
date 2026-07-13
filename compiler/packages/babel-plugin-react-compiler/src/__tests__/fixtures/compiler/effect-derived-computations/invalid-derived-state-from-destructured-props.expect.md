
## Input

```javascript
// @validateNoDerivedComputationsInEffects_exp @loggerTestOnly @outputMode:"lint"
import {useEffect, useState} from 'react';

export default function Component({props}) {
  const [fullName, setFullName] = useState(
    props.firstName + ' ' + props.lastName
  );

  useEffect(() => {
    setFullName(props.firstName + ' ' + props.lastName);
  }, [props.firstName, props.lastName]);

  return <div>{fullName}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{props: {firstName: 'John', lastName: 'Doe'}}],
};

```

## Code

```javascript
// @validateNoDerivedComputationsInEffects_exp @loggerTestOnly @outputMode:"lint"
import { useEffect, useState } from "react";

export default function Component({ props }) {
  const [fullName, setFullName] = useState(
    props.firstName + " " + props.lastName,
  );

  useEffect(() => {
    setFullName(props.firstName + " " + props.lastName);
  }, [props.firstName, props.lastName]);

  return <div>{fullName}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ props: { firstName: "John", lastName: "Doe" } }],
};

```

## Logs

```
{"kind":"CompileError","detail":{"category":"EffectDerivationsOfState","reason":"You might not need an effect. Derive values in render, not effects.","description":"Using an effect triggers an additional render which can hurt performance and user experience, potentially briefly showing stale values to the user\n\nThis setState call is setting a derived value that depends on the following reactive sources:\n\nProps: [props]\n\nData Flow Tree:\n└── props (Prop)\n\nSee: https://react.dev/learn/you-might-not-need-an-effect#updating-state-based-on-props-or-state","severity":"Error","suggestions":null,"details":[{"kind":"error","loc":{"start":{"line":10,"column":4,"index":288},"end":{"line":10,"column":15,"index":299},"filename":"invalid-derived-state-from-destructured-props.ts","identifierName":"setFullName"},"message":"This should be computed during render, not in an effect"}]},"fnLoc":null}
{"kind":"CompileSuccess","fnLoc":{"start":{"line":4,"column":15,"index":141},"end":{"line":14,"column":1,"index":416},"filename":"invalid-derived-state-from-destructured-props.ts"},"fnName":"Component","memoSlots":6,"memoBlocks":2,"memoValues":3,"prunedMemoBlocks":0,"prunedMemoValues":0}
```
      
### Eval output
(kind: ok) <div>John Doe</div>