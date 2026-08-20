
## Input

```javascript
import {makeArray} from 'shared-runtime';

// @flow
function Component() {
  const items = makeArray(0, 1, 2);
  let item;
  let sum = 0;
  while ((item = items.pop())) {
    sum += item;
  }
  return [items, sum];
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

// @flow
function Component() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    const items = makeArray(0, 1, 2);
    let item;
    let sum = 0;
    while ((item = items.pop())) {
      sum = sum + item;
    }
    t0 = [items, sum];
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) [[],3]