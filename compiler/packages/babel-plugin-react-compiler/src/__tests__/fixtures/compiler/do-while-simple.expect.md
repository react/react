
## Input

```javascript
function Component() {
  let x = [1, 2, 3];
  let ret = [];
  do {
    let item = x.pop();
    ret.push(item * 2);
  } while (x.length);
  return ret;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: false,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component() {
  const $ = _c(1);
  let ret;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    const x = [1, 2, 3];
    ret = [];
    do {
      const item = x.pop();
      ret.push(item * 2);
    } while (x.length);
    $[0] = ret;
  } else {
    ret = $[0];
  }
  return ret;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) [6,4,2]