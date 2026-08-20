
## Input

```javascript
function Component(props) {
  let x;
  for (let i = 0; i < 10; i += props.update) {
    if (i > 0 && i % 2 === 0) {
      x = 2;
    } else {
      x = 1;
    }
  }
  // The values assigned to `x` are non-reactive, but the value of `x`
  // depends on the "control" variable `i`, whose possible values are
  // affected by `props.update` which is reactive.
  // Therefore x should be treated as reactive too.
  return [x];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  sequentialRenders: [
    {update: 2},
    {update: 2},
    {update: 1},
    {update: 1},
    {update: 2},
    {update: 1},
    {update: 2},
    {update: 1},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(2);
  let x;
  for (let i = 0; i < 10; i = i + props.update, i) {
    if (i > 0 && i % 2 === 0) {
      x = 2;
    } else {
      x = 1;
    }
  }
  let t0;
  if ($[0] !== x) {
    t0 = [x];
    $[0] = x;
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
    { update: 2 },
    { update: 2 },
    { update: 1 },
    { update: 1 },
    { update: 2 },
    { update: 1 },
    { update: 2 },
    { update: 1 },
  ],
};

```
      
### Eval output
(kind: ok) [2]
[2]
[1]
[1]
[2]
[1]
[2]
[1]