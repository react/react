
## Input

```javascript
function Component(props) {
  const a = [props.a, props.b, 'hello'];
  const x = a.push(42);
  const y = a.at(props.c);

  return {a, x, y};
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 1, b: 2, c: 0}],
  isComponent: false,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(11);
  let a;
  let t0;
  if ($[0] !== props.a || $[1] !== props.b) {
    a = [props.a, props.b, "hello"];
    t0 = a.push(42);
    $[0] = props.a;
    $[1] = props.b;
    $[2] = a;
    $[3] = t0;
  } else {
    a = $[2];
    t0 = $[3];
  }
  const x = t0;
  let t1;
  if ($[4] !== a || $[5] !== props.c) {
    t1 = a.at(props.c);
    $[4] = a;
    $[5] = props.c;
    $[6] = t1;
  } else {
    t1 = $[6];
  }
  const y = t1;
  let t2;
  if ($[7] !== a || $[8] !== x || $[9] !== y) {
    t2 = { a, x, y };
    $[7] = a;
    $[8] = x;
    $[9] = y;
    $[10] = t2;
  } else {
    t2 = $[10];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ a: 1, b: 2, c: 0 }],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) {"a":[1,2,"hello",42],"x":4,"y":1}