
## Input

```javascript
import {identity} from 'shared-runtime';

class Foo {}
function Component({val}) {
  const MyClass = identity(Foo);
  const x = [val];
  const y = new MyClass();

  return [x, y];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{val: 0}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { identity } from "shared-runtime";

class Foo {}
function Component(t0) {
  const $ = _c(6);
  const { val } = t0;
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = identity(Foo);
    $[0] = t1;
  } else {
    t1 = $[0];
  }
  const MyClass = t1;
  let t2;
  if ($[1] !== val) {
    t2 = [val];
    $[1] = val;
    $[2] = t2;
  } else {
    t2 = $[2];
  }
  const x = t2;
  let t3;
  if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
    t3 = new MyClass();
    $[3] = t3;
  } else {
    t3 = $[3];
  }
  const y = t3;
  let t4;
  if ($[4] !== x) {
    t4 = [x, y];
    $[4] = x;
    $[5] = t4;
  } else {
    t4 = $[5];
  }
  return t4;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ val: 0 }],
};

```
      
### Eval output
(kind: ok) [[0],{}]