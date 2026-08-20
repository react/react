
## Input

```javascript
// @enablePropagateDepsInHIR
import {makeObject_Primitives} from 'shared-runtime';

function Component(props) {
  const object = makeObject_Primitives();
  if (props.cond) {
    object.value = 1;
    return object;
  } else {
    object.value = props.value;
    return object;
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{cond: false, value: [0, 1, 2]}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enablePropagateDepsInHIR
import { makeObject_Primitives } from "shared-runtime";

function Component(props) {
  const $ = _c(3);
  let t0;
  if ($[0] !== props.cond || $[1] !== props.value) {
    t0 = Symbol.for("react.early_return_sentinel");
    bb0: {
      const object = makeObject_Primitives();
      if (props.cond) {
        object.value = 1;
        t0 = object;
        break bb0;
      } else {
        object.value = props.value;
        t0 = object;
        break bb0;
      }
    }
    $[0] = props.cond;
    $[1] = props.value;
    $[2] = t0;
  } else {
    t0 = $[2];
  }
  if (t0 !== Symbol.for("react.early_return_sentinel")) {
    return t0;
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ cond: false, value: [0, 1, 2] }],
};

```
      
### Eval output
(kind: ok) {"a":0,"b":"value1","c":true,"value":[0,1,2]}