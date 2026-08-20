
## Input

```javascript
function Component(props) {
  const a = [props.a, props.b, 'hello'];
  const x = a.length;
  const y = a.push;
  return {a, x, y, z: a.concat};
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: [1, 2], b: 2}],
  isComponent: false,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(7);
  let t0;
  if ($[0] !== props.a || $[1] !== props.b) {
    t0 = [props.a, props.b, "hello"];
    $[0] = props.a;
    $[1] = props.b;
    $[2] = t0;
  } else {
    t0 = $[2];
  }
  const a = t0;
  const x = a.length;
  const y = a.push;
  let t1;
  if ($[3] !== a || $[4] !== x || $[5] !== y) {
    t1 = { a, x, y, z: a.concat };
    $[3] = a;
    $[4] = x;
    $[5] = y;
    $[6] = t1;
  } else {
    t1 = $[6];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ a: [1, 2], b: 2 }],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) {"a":[[1,2],2,"hello"],"x":3,"y":"[[ function params=1 ]]","z":"[[ function params=1 ]]"}