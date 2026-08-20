
## Input

```javascript
function Component(props) {
  const x = [{}];
  const y = x.map(item => {
    return item;
  });
  y[0].flag = true;
  return [x, y];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
  isComponent: false,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    const x = [{}];
    const y = x.map(_temp);
    y[0].flag = true;
    t0 = [x, y];
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}
function _temp(item) {
  return item;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) [[{"flag":true}],["[[ cyclic ref *2 ]]"]]