
## Input

```javascript
// @panicThreshold:"none"

function lower(value) {
  if (value == null) {
    throw new Error('lower: missing value');
  }
  return value.toLowerCase();
}

function upper(value) {
  if (value == null) {
    throw new Error('upper: missing value');
  }
  return value.toUpperCase();
}

function Component({value}) {
  const labels = [];
  switch (value) {
    case null:
      labels.push('empty');
      break;
    case lower(value):
      labels.push('lowercase');
      break;
    case upper(value):
      labels.push('uppercase');
      break;
  }
  return labels;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: null}],
  sequentialRenders: [{value: null}, {value: 'a'}, {value: 'A'}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @panicThreshold:"none"

function lower(value) {
  const $ = _c(2);
  if (value == null) {
    throw new Error("lower: missing value");
  }
  let t0;
  if ($[0] !== value) {
    t0 = value.toLowerCase();
    $[0] = value;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

function upper(value) {
  const $ = _c(2);
  if (value == null) {
    throw new Error("upper: missing value");
  }
  let t0;
  if ($[0] !== value) {
    t0 = value.toUpperCase();
    $[0] = value;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

function Component({ value }) {
  const labels = [];
  switch (value) {
    case null:
      labels.push("empty");
      break;
    case lower(value):
      labels.push("lowercase");
      break;
    case upper(value):
      labels.push("uppercase");
      break;
  }
  return labels;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: null }],
  sequentialRenders: [{ value: null }, { value: "a" }, { value: "A" }],
};

```
      
### Eval output
(kind: ok) ["empty"]
["lowercase"]
["uppercase"]