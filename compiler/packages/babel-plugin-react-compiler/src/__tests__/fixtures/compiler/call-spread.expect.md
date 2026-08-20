
## Input

```javascript
import {makeArray} from 'shared-runtime';

function Component(props) {
  const x = makeArray(...props.a, null, ...props.b);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: [1, 2], b: [2, 3, 4]}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { makeArray } from "shared-runtime";

function Component(props) {
  const $ = _c(3);
  let t0;
  if ($[0] !== props.a || $[1] !== props.b) {
    t0 = makeArray(...props.a, null, ...props.b);
    $[0] = props.a;
    $[1] = props.b;
    $[2] = t0;
  } else {
    t0 = $[2];
  }
  const x = t0;
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ a: [1, 2], b: [2, 3, 4] }],
};

```
      
### Eval output
(kind: ok) [1,2,null,2,3,4]