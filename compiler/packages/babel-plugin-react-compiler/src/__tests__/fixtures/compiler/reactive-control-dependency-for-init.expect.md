
## Input

```javascript
function Component(props) {
  let x;
  for (let i = props.init; i < 10; i++) {
    if (i === 0) {
      x = 0;
      break;
    } else {
      x = 1;
      break;
    }
  }
  // The values assigned to `x` are non-reactive, but the value of `x`
  // depends on the "control" variable `i`, whose initial value `props.init` is reactive.
  // Therefore x should be treated as reactive too.
  return [x];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  sequentialRenders: [
    {init: 0},
    {init: 0},
    {init: 10},
    {init: 10},
    {init: 0},
    {init: 10},
    {init: 0},
    {init: 10},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(2);
  let x;
  for (const i = props.init; i < 10; ) {
    if (i === 0) {
      x = 0;
      break;
    } else {
      x = 1;
      break;
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
    { init: 0 },
    { init: 0 },
    { init: 10 },
    { init: 10 },
    { init: 0 },
    { init: 10 },
    { init: 0 },
    { init: 10 },
  ],
};

```
      
### Eval output
(kind: ok) [0]
[0]
[null]
[null]
[0]
[null]
[0]
[null]