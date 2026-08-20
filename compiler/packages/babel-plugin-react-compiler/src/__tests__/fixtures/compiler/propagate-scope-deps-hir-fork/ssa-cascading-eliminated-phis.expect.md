
## Input

```javascript
// @enablePropagateDepsInHIR
function Component(props) {
  let x = 0;
  const values = [];
  const y = props.a || props.b;
  values.push(y);
  if (props.c) {
    x = 1;
  }
  values.push(x);
  if (props.d) {
    x = 2;
  }
  values.push(x);
  return values;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 0, b: 1, c: true, d: true}],
  sequentialRenders: [
    {a: 0, b: 1, c: true, d: true},
    {a: 4, b: 1, c: true, d: true},
    {a: 4, b: 1, c: false, d: true},
    {a: 4, b: 1, c: false, d: false},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enablePropagateDepsInHIR
function Component(props) {
  const $ = _c(7);
  let x = 0;
  let values;
  if (
    $[0] !== props.a ||
    $[1] !== props.b ||
    $[2] !== props.c ||
    $[3] !== props.d ||
    $[4] !== x
  ) {
    values = [];
    const y = props.a || props.b;
    values.push(y);
    if (props.c) {
      x = 1;
    }

    values.push(x);
    if (props.d) {
      x = 2;
    }

    values.push(x);
    $[0] = props.a;
    $[1] = props.b;
    $[2] = props.c;
    $[3] = props.d;
    $[4] = x;
    $[5] = values;
    $[6] = x;
  } else {
    values = $[5];
    x = $[6];
  }
  return values;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ a: 0, b: 1, c: true, d: true }],
  sequentialRenders: [
    { a: 0, b: 1, c: true, d: true },
    { a: 4, b: 1, c: true, d: true },
    { a: 4, b: 1, c: false, d: true },
    { a: 4, b: 1, c: false, d: false },
  ],
};

```
      
### Eval output
(kind: ok) [1,1,2]
[4,1,2]
[4,0,2]
[4,0,0]