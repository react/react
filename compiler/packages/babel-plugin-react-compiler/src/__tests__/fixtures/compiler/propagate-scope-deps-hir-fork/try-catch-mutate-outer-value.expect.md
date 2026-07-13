
## Input

```javascript
// @enablePropagateDepsInHIR
const {shallowCopy, throwErrorWithMessage} = require('shared-runtime');

function Component(props) {
  const x = [];
  try {
    x.push(throwErrorWithMessage('oops'));
  } catch {
    x.push(shallowCopy({a: props.a}));
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 1}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enablePropagateDepsInHIR
const { shallowCopy, throwErrorWithMessage } = require("shared-runtime");

function Component(props) {
  const $ = _c(5);
  let x;
  if ($[0] !== props) {
    x = [];
    try {
      let t0;
      if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
        t0 = throwErrorWithMessage("oops");
        $[2] = t0;
      } else {
        t0 = $[2];
      }
      x.push(t0);
    } catch {
      let t0;
      if ($[3] !== props.a) {
        t0 = shallowCopy({ a: props.a });
        $[3] = props.a;
        $[4] = t0;
      } else {
        t0 = $[4];
      }
      x.push(t0);
    }
    $[0] = props;
    $[1] = x;
  } else {
    x = $[1];
  }

  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ a: 1 }],
};

```
      
### Eval output
(kind: ok) [{"a":1}]