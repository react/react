
## Input

```javascript
import {identity} from 'shared-runtime';

function Component([x]) {
  x = identity(x);
  const read = () => x;
  return read();
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [[42]],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { identity } from "shared-runtime";

function Component(t0) {
  const $ = _c(2);
  let t1;
  if ($[0] !== t0) {
    const [t2] = t0;
    let x = t2;
    x = identity(x);
    const read = () => x;
    t1 = read();
    $[0] = t0;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [[42]],
};

```
      
### Eval output
(kind: ok) 42