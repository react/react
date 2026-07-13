
## Input

```javascript
const {throwInput} = require('shared-runtime');

function Component(props) {
  try {
    const y = [];
    y.push(props.y);
    throwInput(y);
  } catch (e) {
    e.push(props.e);
    return e;
  }
  return null;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{y: 'foo', e: 'bar'}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
const { throwInput } = require("shared-runtime");

function Component(props) {
  const $ = _c(3);
  let t0;
  if ($[0] !== props.e || $[1] !== props.y) {
    t0 = Symbol.for("react.early_return_sentinel");
    bb0: {
      try {
        const y = [];
        y.push(props.y);
        throwInput(y);
      } catch (t1) {
        const e = t1;
        e.push(props.e);
        t0 = e;
        break bb0;
      }
    }
    $[0] = props.e;
    $[1] = props.y;
    $[2] = t0;
  } else {
    t0 = $[2];
  }
  if (t0 !== Symbol.for("react.early_return_sentinel")) {
    return t0;
  }

  return null;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ y: "foo", e: "bar" }],
};

```
      
### Eval output
(kind: ok) ["foo","bar"]