
## Input

```javascript
function Component(props) {
  let x = 0;

  let value = null;
  loop: for (let i = 0; i < 10; i++) {
    switch (value) {
      case true: {
        x = 1;
        break loop;
      }
      case false: {
        x = 2;
        break loop;
      }
    }

    value = props.cond;
  }

  // The values assigned to `x` are non-reactive, but the value of `x`
  // depends on the "control" variable `value` used as the switch test
  // condition. That variable is initially null on the first iteration
  // of the loop, but is later set to `props.value` which is reactive.
  // Therefore x should be treated as reactive.
  return [x];
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
  let x = 0;

  let value = null;
  for (let i = 0; i < 10; i++) {
    switch (value) {
      case true: {
        x = 1;
        break;
      }
      case false: {
        x = 2;
        break;
      }
    }

    value = props.cond;
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
(kind: ok) [1]
[1]
[2]
[2]
[1]
[2]
[1]
[2]