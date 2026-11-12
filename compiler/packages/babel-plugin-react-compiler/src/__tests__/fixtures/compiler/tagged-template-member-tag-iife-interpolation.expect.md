
## Input

```javascript
import {print} from 'shared-runtime';

const obj = {
  prefix: 'obj',
  tag(strings, value) {
    return this.prefix + value;
  },
};

// The IIFE is emitted as statements, but the tag load must stay attached to the call
function Component(props) {
  return props.obj.tag`${(() => {
    print(1);
    return 1;
  })()}`;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{obj}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { print } from "shared-runtime";

const obj = {
  prefix: "obj",
  tag(strings, value) {
    return this.prefix + value;
  },
};

// The IIFE is emitted as statements, but the tag load must stay attached to the call
function Component(props) {
  const $ = _c(2);
  const t0 = props.obj;
  let t1;
  if ($[0] !== props.obj) {
    const t2 = t0.tag;
    print(1);
    t1 = t2.bind(t0)`${1}`;
    $[0] = props.obj;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ obj }],
};

```
      
### Eval output
(kind: ok) "obj1"
logs: [1]