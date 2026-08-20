
## Input

```javascript
function Component(props) {
  const items = props.items.map(x => x);
  const x = 42;
  return [x, items];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{items: [0, 42, null, undefined, {object: true}]}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(4);
  let t0;
  if ($[0] !== props.items) {
    t0 = props.items.map(_temp);
    $[0] = props.items;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const items = t0;
  let t1;
  if ($[2] !== items) {
    t1 = [42, items];
    $[2] = items;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  return t1;
}
function _temp(x) {
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ items: [0, 42, null, undefined, { object: true }] }],
};

```
      
### Eval output
(kind: ok) [42,[0,42,null,null,{"object":true}]]