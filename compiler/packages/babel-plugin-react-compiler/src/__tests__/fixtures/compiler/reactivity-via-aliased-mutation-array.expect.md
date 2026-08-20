
## Input

```javascript
function Component(props) {
  const x = [];
  const y = x;
  y.push(props.input);

  return [x[0]];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  sequentialRenders: [
    {input: 42},
    {input: 42},
    {input: 'sathya'},
    {input: 'sathya'},
    {input: 42},
    {input: 'sathya'},
    {input: 42},
    {input: 'sathya'},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(4);
  let x;
  if ($[0] !== props.input) {
    x = [];
    const y = x;
    y.push(props.input);
    $[0] = props.input;
    $[1] = x;
  } else {
    x = $[1];
  }
  let t0;
  if ($[2] !== x[0]) {
    t0 = [x[0]];
    $[2] = x[0];
    $[3] = t0;
  } else {
    t0 = $[3];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  sequentialRenders: [
    { input: 42 },
    { input: 42 },
    { input: "sathya" },
    { input: "sathya" },
    { input: 42 },
    { input: "sathya" },
    { input: 42 },
    { input: "sathya" },
  ],
};

```
      
### Eval output
(kind: ok) [42]
[42]
["sathya"]
["sathya"]
[42]
["sathya"]
[42]
["sathya"]