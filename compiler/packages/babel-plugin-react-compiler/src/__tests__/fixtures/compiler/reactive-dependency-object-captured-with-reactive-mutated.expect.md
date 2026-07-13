
## Input

```javascript
const {mutate} = require('shared-runtime');

function Component(props) {
  const x = {};
  const y = props.y;
  const z = [x, y];
  mutate(z);
  // x's object identity can change bc it co-mutates with z, which is reactive via props.y
  return [x];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{y: 42}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
const { mutate } = require("shared-runtime");

function Component(props) {
  const $ = _c(2);
  let t0;
  if ($[0] !== props.y) {
    const x = {};
    const y = props.y;
    const z = [x, y];
    mutate(z);
    t0 = [x];
    $[0] = props.y;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ y: 42 }],
};

```
      
### Eval output
(kind: ok) [{}]