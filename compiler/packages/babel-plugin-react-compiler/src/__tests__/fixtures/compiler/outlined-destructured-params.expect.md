
## Input

```javascript
import {Stringify} from 'shared-runtime';

function Component(props) {
  // test outlined functions with destructured parameters - the
  // temporary for the destructured param must be promoted
  return (
    <>
      {props.items.map(({id, name}) => (
        <Stringify key={id} name={name} />
      ))}
    </>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{items: [{id: 1, name: 'one'}]}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify } from "shared-runtime";

function Component(props) {
  const $ = _c(4);
  let t0;
  if ($[0] !== props.items) {
    t0 = props.items.map(_temp);
    $[0] = props.items;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  let t1;
  if ($[2] !== t0) {
    t1 = <>{t0}</>;
    $[2] = t0;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  return t1;
}
function _temp(t0) {
  const { id, name } = t0;
  return <Stringify key={id} name={name} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ items: [{ id: 1, name: "one" }] }],
};

```
      
### Eval output
(kind: ok) <div>{"name":"one"}</div>