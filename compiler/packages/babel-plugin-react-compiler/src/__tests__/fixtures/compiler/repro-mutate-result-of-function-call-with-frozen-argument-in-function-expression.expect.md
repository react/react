
## Input

```javascript
import {identity, makeObject_Primitives, Stringify} from 'shared-runtime';

function Example(props) {
  const object = props.object;
  const f = () => {
    // The argument maybe-aliases into the return
    const obj = identity(object);
    obj.property = props.value;
    return obj;
  };
  const obj = f();
  return <Stringify obj={obj} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Example,
  params: [{object: makeObject_Primitives(), value: 42}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { identity, makeObject_Primitives, Stringify } from "shared-runtime";

function Example(props) {
  const $ = _c(5);
  const object = props.object;
  let t0;
  if ($[0] !== object || $[1] !== props.value) {
    const f = () => {
      const obj = identity(object);
      obj.property = props.value;
      return obj;
    };
    t0 = f();
    $[0] = object;
    $[1] = props.value;
    $[2] = t0;
  } else {
    t0 = $[2];
  }
  const obj_0 = t0;
  let t1;
  if ($[3] !== obj_0) {
    t1 = <Stringify obj={obj_0} />;
    $[3] = obj_0;
    $[4] = t1;
  } else {
    t1 = $[4];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Example,
  params: [{ object: makeObject_Primitives(), value: 42 }],
};

```
      
### Eval output
(kind: ok) <div>{"obj":{"a":0,"b":"value1","c":true,"property":42}}</div>