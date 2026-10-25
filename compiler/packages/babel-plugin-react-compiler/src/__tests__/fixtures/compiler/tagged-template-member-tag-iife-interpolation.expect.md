
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
  let t0;
  if ($[0] !== props.obj.tag) {
    print(1);
    t0 = props.obj.tag`${1}`;
    $[0] = props.obj.tag;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ obj }],
};

```
      
### Eval output
(kind: ok) "obj1"
logs: [1]