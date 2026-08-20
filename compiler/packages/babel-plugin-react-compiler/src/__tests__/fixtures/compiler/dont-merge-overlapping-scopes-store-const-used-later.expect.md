
## Input

```javascript
import {Stringify, makeObject_Primitives} from 'shared-runtime';

function Component(props) {
  const array = [props.count];
  const x = makeObject_Primitives();
  const element = <div>{array}</div>;
  console.log(x);
  return <div>{element}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{count: 42}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify, makeObject_Primitives } from "shared-runtime";

function Component(props) {
  const $ = _c(6);
  let t0;
  if ($[0] !== props.count) {
    t0 = [props.count];
    $[0] = props.count;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const array = t0;
  const x = makeObject_Primitives();
  let t1;
  if ($[2] !== array) {
    t1 = <div>{array}</div>;
    $[2] = array;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  const element = t1;
  console.log(x);
  let t2;
  if ($[4] !== element) {
    t2 = <div>{element}</div>;
    $[4] = element;
    $[5] = t2;
  } else {
    t2 = $[5];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ count: 42 }],
};

```
      
### Eval output
(kind: ok) <div><div>42</div></div>
logs: [{ a: 0, b: 'value1', c: true }]