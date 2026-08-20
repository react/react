
## Input

```javascript
function Component(props) {
  let a = props.x;
  let b;
  let c;
  let d;
  if (props.cond) {
    d = ((b = a), a++, (c = a), ++a);
  }
  return [a, b, c, d];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{x: 2, cond: true}],
  isComponent: false,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(5);
  let a = props.x;
  let b;
  let c;
  let d;
  if (props.cond) {
    d = ((b = a), a++, (c = a), ++a);
  }
  let t0;
  if ($[0] !== a || $[1] !== b || $[2] !== c || $[3] !== d) {
    t0 = [a, b, c, d];
    $[0] = a;
    $[1] = b;
    $[2] = c;
    $[3] = d;
    $[4] = t0;
  } else {
    t0 = $[4];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ x: 2, cond: true }],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) [4,2,3,4]