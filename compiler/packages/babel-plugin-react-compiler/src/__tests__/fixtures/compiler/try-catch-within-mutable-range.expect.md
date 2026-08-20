
## Input

```javascript
const {throwErrorWithMessage, shallowCopy} = require('shared-runtime');

function Component(props) {
  const x = [];
  try {
    x.push(throwErrorWithMessage('oops'));
  } catch {
    x.push(shallowCopy({}));
  }
  x.push(props.value); // extend the mutable range to include the try/catch
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
const { throwErrorWithMessage, shallowCopy } = require("shared-runtime");

function Component(props) {
  const $ = _c(4);
  let x;
  if ($[0] !== props.value) {
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
      if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
        t0 = shallowCopy({});
        $[3] = t0;
      } else {
        t0 = $[3];
      }
      x.push(t0);
    }

    x.push(props.value);
    $[0] = props.value;
    $[1] = x;
  } else {
    x = $[1];
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) [{},null]