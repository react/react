
## Input

```javascript
import {Stringify} from 'shared-runtime';
function Component(props) {
  const cb = (x, y, z) => x + y + z;

  return <Stringify cb={cb} id={props.id} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{id: 0}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify } from "shared-runtime";
function Component(props) {
  const $ = _c(2);
  const cb = _temp;
  let t0;
  if ($[0] !== props.id) {
    t0 = <Stringify cb={cb} id={props.id} />;
    $[0] = props.id;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}
function _temp(x, y, z) {
  return x + y + z;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ id: 0 }],
};

```
      
### Eval output
(kind: ok) <div>{"cb":"[[ function params=3 ]]","id":0}</div>