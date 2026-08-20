
## Input

```javascript
import {identity, Stringify, useIdentity} from 'shared-runtime';

function Component(props) {
  const {x, ...rest} = useIdentity(props);
  const z = rest.z;
  identity(z);
  return <Stringify x={x} z={z} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{x: 'Hello', z: 'World'}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { identity, Stringify, useIdentity } from "shared-runtime";

function Component(props) {
  const $ = _c(6);
  const t0 = useIdentity(props);
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
  const z = rest.z;
  identity(z);
  let t1;
  if ($[3] !== x || $[4] !== z) {
    t1 = <Stringify x={x} z={z} />;
    $[3] = x;
    $[4] = z;
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
(kind: ok) <div>{"x":"Hello","z":"World"}</div>