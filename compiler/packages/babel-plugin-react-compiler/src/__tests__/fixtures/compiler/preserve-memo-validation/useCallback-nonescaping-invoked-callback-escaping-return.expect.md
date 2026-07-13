
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees @enableAssumeHooksFollowRulesOfReact @enableTransitivelyFreezeFunctionExpressions @validateExhaustiveMemoizationDependencies:false
import {useCallback} from 'react';

function Component({entity, children}) {
  const showMessage = useCallback(() => entity != null);

  // We currently model functions as if they could escape intor their return value
  // but if we ever changed that (or did optimization to figure out cases where they
  // are known not to) we could get a false positive validation error here, since
  // showMessage doesn't need to be memoized since it doesn't escape in this instance.
  const shouldShowMessage = showMessage();
  return (
    <div>
      <div>{shouldShowMessage}</div>
      <div>{children}</div>
    </div>
  );
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
import { c as _c } from "react/compiler-runtime"; // @validatePreserveExistingMemoizationGuarantees @enableAssumeHooksFollowRulesOfReact @enableTransitivelyFreezeFunctionExpressions @validateExhaustiveMemoizationDependencies:false
import { useCallback } from "react";

function Component(t0) {
  const $ = _c(9);
  const { entity, children } = t0;
  let t1;
  if ($[0] !== entity) {
    t1 = () => entity != null;
    $[0] = entity;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const showMessage = t1;

  const shouldShowMessage = showMessage();
  let t2;
  if ($[2] !== shouldShowMessage) {
    t2 = <div>{shouldShowMessage}</div>;
    $[2] = shouldShowMessage;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  let t3;
  if ($[4] !== children) {
    t3 = <div>{children}</div>;
    $[4] = children;
    $[5] = t3;
  } else {
    t3 = $[5];
  }
  let t4;
  if ($[6] !== t2 || $[7] !== t3) {
    t4 = (
      <div>
        {t2}
        {t3}
      </div>
    );
    $[6] = t2;
    $[7] = t3;
    $[8] = t4;
  } else {
    t4 = $[8];
  }
  return t4;
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
(kind: ok) <div><div></div><div><div>Hi Sathya!</div></div></div>