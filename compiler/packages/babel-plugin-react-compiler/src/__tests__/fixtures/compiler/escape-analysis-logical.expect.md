
## Input

```javascript
function Component(props) {
  const a = [props.a];
  const b = [props.b];
  const c = [props.c];
  // We don't do constant folding for non-primitive values (yet) so we consider
  // that any of a, b, or c could return here
  return (a && b) || c;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(6);
  let t0;
  if ($[0] !== props.a) {
    t0 = [props.a];
    $[0] = props.a;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const a = t0;
  let t1;
  if ($[2] !== props.b) {
    t1 = [props.b];
    $[2] = props.b;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  const b = t1;
  let t2;
  if ($[4] !== props.c) {
    t2 = [props.c];
    $[4] = props.c;
    $[5] = t2;
  } else {
    t2 = $[5];
  }
  const c = t2;

  return (a && b) || c;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ["TodoAdd"],
  isComponent: "TodoAdd",
};

```
      