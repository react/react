
## Input

```javascript
function Component(props) {
  let x;
  for (const key in props.values) {
    const i = parseInt(key, 10);
    if (i > 10) {
      x = 10;
    } else {
      x = 1;
    }
  }
  // The values assigned to `x` are non-reactive, but the value of `x`
  // depends on the "control" variable `i`, whose value is derived from
  // `props.values` which is reactive.
  // Therefore x should be treated as reactive too.
  return [x];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  sequentialRenders: [
    {values: {'12': true}},
    {values: {'12': true}},
    {values: {'1': true}},
    {values: {'1': true}},
    {values: {'12': true}},
    {values: {'1': true}},
    {values: {'12': true}},
    {values: {'1': true}},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(2);
  let x;
  for (const key in props.values) {
    const i = parseInt(key, 10);
    if (i > 10) {
      x = 10;
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
    { values: { "12": true } },
    { values: { "12": true } },
    { values: { "1": true } },
    { values: { "1": true } },
    { values: { "12": true } },
    { values: { "1": true } },
    { values: { "12": true } },
    { values: { "1": true } },
  ],
};

```
      
### Eval output
(kind: ok) [10]
[10]
[1]
[1]
[10]
[1]
[10]
[1]