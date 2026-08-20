
## Input

```javascript
function Component(props) {
  const x = {};
  const y = [];
  x.y = y;
  x.y.push(props.input);

  let z = 0;
  if (x.y[0]) {
    z = 1;
  }

  return [z];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  sequentialRenders: [
    {input: true},
    {input: true},
    {input: false},
    {input: false},
    {input: true},
    {input: false},
    {input: true},
    {input: false},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(2);
  const x = {};
  const y = [];
  x.y = y;
  x.y.push(props.input);

  let z = 0;
  if (x.y[0]) {
    z = 1;
  }
  let t0;
  if ($[0] !== z) {
    t0 = [z];
    $[0] = z;
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
    { input: true },
    { input: true },
    { input: false },
    { input: false },
    { input: true },
    { input: false },
    { input: true },
    { input: false },
  ],
};

```
      
### Eval output
(kind: ok) [1]
[1]
[0]
[0]
[1]
[0]
[1]
[0]