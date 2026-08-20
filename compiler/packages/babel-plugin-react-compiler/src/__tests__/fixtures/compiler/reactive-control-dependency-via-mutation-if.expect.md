
## Input

```javascript
function Component(props) {
  // x is mutated conditionally based on a reactive value,
  // so it needs to be considered reactive
  let x = [];
  if (props.cond) {
    x.push(1);
  }
  // Since x is reactive, y is now reactively controlled too:
  let y = false;
  if (x[0]) {
    y = true;
  }
  // Thus this value should be reactive on `y`:
  return [y];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  sequentialRenders: [
    {cond: true},
    {cond: true},
    {cond: false},
    {cond: false},
    {cond: true},
    {cond: false},
    {cond: true},
    {cond: false},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(2);

  const x = [];
  if (props.cond) {
    x.push(1);
  }

  let y = false;
  if (x[0]) {
    y = true;
  }
  let t0;
  if ($[0] !== y) {
    t0 = [y];
    $[0] = y;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  sequentialRenders: [
    { cond: true },
    { cond: true },
    { cond: false },
    { cond: false },
    { cond: true },
    { cond: false },
    { cond: true },
    { cond: false },
  ],
};

```
      
### Eval output
(kind: ok) [true]
[true]
[false]
[false]
[true]
[false]
[true]
[false]