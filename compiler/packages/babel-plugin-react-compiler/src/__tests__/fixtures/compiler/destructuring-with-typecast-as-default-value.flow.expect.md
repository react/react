
## Input

```javascript
// @flow
function Component(props) {
  const [x = ([]: Array<number>)] = props.y;
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{y: []}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(2);
  const [t0] = props.y;
  let t1;
  if ($[0] !== t0) {
    t1 = t0 === undefined ? ([]: Array<number>) : t0;
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
  params: [{ y: [] }],
};

```
      
### Eval output
(kind: ok) []