
## Input

```javascript
function Component(props) {
  const a = [0, 0];
  let i = 0;
  a[i++] = i;
  return a.join(',');
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
  let a;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    a = [0, 0];

    a[0] = 1;
    $[0] = a;
  } else {
    a = $[0];
  }
  return a.join(",");
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) "1,0"