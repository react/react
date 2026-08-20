
## Input

```javascript
// props.a.b should be added as a unconditional dependency to the reactive
// scope that produces x, since it is accessed unconditionally in all cfg
// paths

import {identity, addOne} from 'shared-runtime';

function useCondDepInConditionalExpr(props, cond) {
  const x = identity(cond) ? addOne(props.a.b) : identity(props.a.b);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useCondDepInConditionalExpr,
  params: [{a: {b: 2}}, true],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // props.a.b should be added as a unconditional dependency to the reactive
// scope that produces x, since it is accessed unconditionally in all cfg
// paths

import { identity, addOne } from "shared-runtime";

function useCondDepInConditionalExpr(props, cond) {
  const $ = _c(3);
  let t0;
  if ($[0] !== cond || $[1] !== props.a.b) {
    t0 = identity(cond) ? addOne(props.a.b) : identity(props.a.b);
    $[0] = cond;
    $[1] = props.a.b;
    $[2] = t0;
  } else {
    t0 = $[2];
  }
  const x = t0;
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useCondDepInConditionalExpr,
  params: [{ a: { b: 2 } }, true],
};

```
      
### Eval output
(kind: ok) 3