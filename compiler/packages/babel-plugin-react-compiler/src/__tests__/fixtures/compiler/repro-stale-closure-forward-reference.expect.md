
## Input

```javascript
import {useState} from 'react';

/**
 * Repro for https://github.com/facebook/react/issues/35122
 *
 * InferReactiveScopeVariables was excluding primitive operands
 * when considering operands for merging. We previously did not
 * infer types for context variables (StoreContext etc), but later
 * started inferring types in cases of `const` context variables,
 * since the type cannot change.
 *
 * In this example, this meant that we skipped the `isExpired`
 * operand of the onClick function expression when considering
 * scopes to merge.
 */
function Test1() {
  const [expire, setExpire] = useState(5);

  const onClick = () => {
    // Reference to isExpired prior to declaration
    console.log('isExpired', isExpired);
  };

  const isExpired = expire === 0;

  return <div onClick={onClick}>{expire}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Test1,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useState } from "react";

/**
 * Repro for https://github.com/facebook/react/issues/35122
 *
 * InferReactiveScopeVariables was excluding primitive operands
 * when considering operands for merging. We previously did not
 * infer types for context variables (StoreContext etc), but later
 * started inferring types in cases of `const` context variables,
 * since the type cannot change.
 *
 * In this example, this meant that we skipped the `isExpired`
 * operand of the onClick function expression when considering
 * scopes to merge.
 */
function Test1() {
  const $ = _c(5);
  const [expire] = useState(5);
  let onClick;
  if ($[0] !== expire) {
    onClick = () => {
      console.log("isExpired", isExpired);
    };

    const isExpired = expire === 0;
    $[0] = expire;
    $[1] = onClick;
  } else {
    onClick = $[1];
  }
  let t0;
  if ($[2] !== expire || $[3] !== onClick) {
    t0 = <div onClick={onClick}>{expire}</div>;
    $[2] = expire;
    $[3] = onClick;
    $[4] = t0;
  } else {
    t0 = $[4];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Test1,
  params: [{}],
};

```
      
### Eval output
(kind: ok) <div>5</div>