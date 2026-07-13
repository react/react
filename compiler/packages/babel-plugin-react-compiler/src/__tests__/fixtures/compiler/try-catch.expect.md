
## Input

```javascript
const {throwErrorWithMessage} = require('shared-runtime');

function Component(props) {
  let x;
  try {
    x = throwErrorWithMessage('oops');
  } catch {
    x = null;
  }
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
const { throwErrorWithMessage } = require("shared-runtime");

function Component(props) {
  const $ = _c(1);
  let x;
  try {
    let t0;
    if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
      t0 = throwErrorWithMessage("oops");
      $[0] = t0;
    } else {
      t0 = $[0];
    }
    x = t0;
  } catch {
    x = null;
  }

  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) null