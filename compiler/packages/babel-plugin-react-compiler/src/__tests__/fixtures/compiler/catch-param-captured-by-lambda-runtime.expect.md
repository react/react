
## Input

```javascript
import {throwErrorWithMessageIf} from 'shared-runtime';

// The catch param `e` is captured by a lambda. It is initialized before the
// catch body runs, so it must not be hoisted as a context variable.
function Component({shouldThrow}) {
  let message = 'ok';
  try {
    throwErrorWithMessageIf(shouldThrow, 'boom');
  } catch (e) {
    const getMessage = () => e.message;
    message = getMessage();
  }
  return <div>{message}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{shouldThrow: true}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { throwErrorWithMessageIf } from "shared-runtime";

// The catch param `e` is captured by a lambda. It is initialized before the
// catch body runs, so it must not be hoisted as a context variable.
function Component(t0) {
  const $ = _c(3);
  const { shouldThrow } = t0;
  let message = "ok";
  if ($[0] !== shouldThrow) {
    try {
      throwErrorWithMessageIf(shouldThrow, "boom");
    } catch (t1) {
      const e = t1;
      const getMessage = () => e.message;
      message = getMessage();
    }
    $[0] = shouldThrow;
    $[1] = message;
  } else {
    message = $[1];
  }
  let t1;
  if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = <div>{message}</div>;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ shouldThrow: true }],
};

```
      
### Eval output
(kind: ok) <div>boom</div>