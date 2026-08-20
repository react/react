
## Input

```javascript
function Component(props) {
  const [y, ...{z}] = props.value;
  return [y, z];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: ['y', {z: 'z!'}]}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(6);
  let t0;
  let y;
  if ($[0] !== props.value) {
    [y, ...t0] = props.value;
    $[0] = props.value;
    $[1] = t0;
    $[2] = y;
  } else {
    t0 = $[1];
    y = $[2];
  }
  const { z } = t0;
  let t1;
  if ($[3] !== y || $[4] !== z) {
    t1 = [y, z];
    $[3] = y;
    $[4] = z;
    $[5] = t1;
  } else {
    t1 = $[5];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: ["y", { z: "z!" }] }],
};

```
      
### Eval output
(kind: ok) ["y",null]