
## Input

```javascript
// @enablePropagateDepsInHIR @validateExhaustiveMemoizationDependencies:false
import {useMemo} from 'react';

function Component(props) {
  const x = useMemo(() => {
    let y = [];
    if (props.cond) {
      y.push(props.a);
    }
    if (props.cond2) {
      return y;
    }
    y.push(props.b);
    return y;
  });
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 1, b: 2, cond2: false}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enablePropagateDepsInHIR @validateExhaustiveMemoizationDependencies:false
import { useMemo } from "react";

function Component(props) {
  const $ = _c(5);
  let t0;
  if (
    $[0] !== props.a ||
    $[1] !== props.b ||
    $[2] !== props.cond ||
    $[3] !== props.cond2
  ) {
    bb0: {
      const y = [];
      if (props.cond) {
        y.push(props.a);
      }

      if (props.cond2) {
        t0 = y;
        break bb0;
      }

      y.push(props.b);
      t0 = y;
    }
    $[0] = props.a;
    $[1] = props.b;
    $[2] = props.cond;
    $[3] = props.cond2;
    $[4] = t0;
  } else {
    t0 = $[4];
  }
  const x = t0;

  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ a: 1, b: 2, cond2: false }],
};

```
      
### Eval output
(kind: ok) [2]