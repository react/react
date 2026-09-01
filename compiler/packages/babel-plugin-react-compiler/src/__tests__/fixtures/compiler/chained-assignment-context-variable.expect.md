
## Input

```javascript
import {makeArray} from 'shared-runtime';

function Component() {
  let x,
    y = (x = {});
  const foo = () => {
    x = makeArray();
  };
  foo();
  return [y, x];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { makeArray } from "shared-runtime";

function Component() {
  const $ = _c(3);
  let x;
  let y;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    y = x = {};
    const foo = () => {
      x = makeArray();
    };

    foo();
    $[0] = x;
    $[1] = y;
  } else {
    x = $[0];
    y = $[1];
  }
  let t0;
  if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = [y, x];
    $[2] = t0;
  } else {
    t0 = $[2];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) [{},[]]