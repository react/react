
## Input

```javascript
import {CONST_STRING0} from 'shared-runtime';

function t(props) {
  let x = [, CONST_STRING0, props];
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: t,
  params: [{a: 1, b: 2}],
  isComponent: false,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { CONST_STRING0 } from "shared-runtime";

function t(props) {
  const $ = _c(2);
  let t0;
  if ($[0] !== props) {
    t0 = [, CONST_STRING0, props];
    $[0] = props;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const x = t0;
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: t,
  params: [{ a: 1, b: 2 }],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) [null,"global string 0",{"a":1,"b":2}]