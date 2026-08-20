
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees @enableAssumeHooksFollowRulesOfReact @enableTransitivelyFreezeFunctionExpressions
import {useCallback} from 'react';

function Component({entity, children}) {
  // showMessage doesn't escape so we don't memoize it.
  // However, validatePreserveExistingMemoizationGuarantees only sees that the scope
  // doesn't exist, and thinks the memoization was missed instead of being intentionally dropped.
  const showMessage = useCallback(() => entity != null, [entity]);

  if (!showMessage()) {
    return children;
  }

  return <div>{children}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [
    {
      entity: {name: 'Sathya'},
      children: [<div key="gsathya">Hi Sathya!</div>],
    },
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validatePreserveExistingMemoizationGuarantees @enableAssumeHooksFollowRulesOfReact @enableTransitivelyFreezeFunctionExpressions
import { useCallback } from "react";

function Component(t0) {
  const $ = _c(2);
  const { entity, children } = t0;

  const showMessage = () => entity != null;

  if (!showMessage()) {
    return children;
  }
  let t1;
  if ($[0] !== children) {
    t1 = <div>{children}</div>;
    $[0] = children;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [
    {
      entity: { name: "Sathya" },
      children: [<div key="gsathya">Hi Sathya!</div>],
    },
  ],
};

```
      
### Eval output
(kind: ok) <div><div>Hi Sathya!</div></div>