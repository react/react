
## Input

```javascript
import {makeObject_Primitives, Stringify} from 'shared-runtime';

function Example(props) {
  const obj = props.object.makeObject();
  obj.property = props.value;
  return <Stringify obj={obj} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Example,
  params: [{object: {makeObject: makeObject_Primitives}, value: 42}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { makeObject_Primitives, Stringify } from "shared-runtime";

function Example(props) {
  const $ = _c(5);
  let obj;
  if ($[0] !== props.object || $[1] !== props.value) {
    obj = props.object.makeObject();
    obj.property = props.value;
    $[0] = props.object;
    $[1] = props.value;
    $[2] = obj;
  } else {
    obj = $[2];
  }
  let t0;
  if ($[3] !== obj) {
    t0 = <Stringify obj={obj} />;
    $[3] = obj;
    $[4] = t0;
  } else {
    t0 = $[4];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Example,
  params: [{ object: { makeObject: makeObject_Primitives }, value: 42 }],
};

```
      
### Eval output
(kind: ok) <div>{"obj":{"a":0,"b":"value1","c":true,"property":42}}</div>