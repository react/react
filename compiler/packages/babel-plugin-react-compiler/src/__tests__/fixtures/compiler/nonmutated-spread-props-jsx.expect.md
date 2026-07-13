
## Input

```javascript
import {identity, Stringify} from 'shared-runtime';

function Component({x, ...rest}) {
  return <Stringify {...rest} x={x} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{x: 'Hello', z: 'World'}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { identity, Stringify } from "shared-runtime";

function Component(t0) {
  const $ = _c(6);
  let rest;
  let x;
  if ($[0] !== t0) {
    ({ x, ...rest } = t0);
    $[0] = t0;
    $[1] = rest;
    $[2] = x;
  } else {
    rest = $[1];
    x = $[2];
  }
  let t1;
  if ($[3] !== rest || $[4] !== x) {
    t1 = <Stringify {...rest} x={x} />;
    $[3] = rest;
    $[4] = x;
    $[5] = t1;
  } else {
    t1 = $[5];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ x: "Hello", z: "World" }],
};

```
      
### Eval output
(kind: ok) <div>{"z":"World","x":"Hello"}</div>