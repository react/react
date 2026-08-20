
## Input

```javascript
function Component(props) {
  const [x = [-1, 1]] = props.value;
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: []}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(2);
  const [t0] = props.value;
  let t1;
  if ($[0] !== t0) {
    t1 = t0 === undefined ? [-1, 1] : t0;
    $[0] = t0;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const x = t1;
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: [] }],
};

```
      
### Eval output
(kind: ok) [-1,1]