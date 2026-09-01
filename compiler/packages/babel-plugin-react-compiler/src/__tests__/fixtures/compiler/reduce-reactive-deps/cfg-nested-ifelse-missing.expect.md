
## Input

```javascript
// props.a.b should NOT be added as a unconditional dependency to the reactive
// scope that produces x if it is not accessed in every path

import {identity, getNull} from 'shared-runtime';

function useCondDepInNestedIfElse(props, cond) {
  const x = {};
  if (identity(cond)) {
    if (getNull()) {
      x.a = props.a.b;
    }
  } else {
    x.d = props.a.b;
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useCondDepInNestedIfElse,
  params: [{a: {b: 2}}, true],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // props.a.b should NOT be added as a unconditional dependency to the reactive
// scope that produces x if it is not accessed in every path

import { identity, getNull } from "shared-runtime";

function useCondDepInNestedIfElse(props, cond) {
  const $ = _c(3);
  let x;
  if ($[0] !== cond || $[1] !== props) {
    x = {};
    if (identity(cond)) {
      if (getNull()) {
        x.a = props.a.b;
      }
    } else {
      x.d = props.a.b;
    }
    $[0] = cond;
    $[1] = props;
    $[2] = x;
  } else {
    x = $[2];
  }

  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useCondDepInNestedIfElse,
  params: [{ a: { b: 2 } }, true],
};

```
      
### Eval output
(kind: ok) {}