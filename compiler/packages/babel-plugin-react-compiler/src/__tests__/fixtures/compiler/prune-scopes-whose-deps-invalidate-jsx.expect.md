
## Input

```javascript
import {useHook} from 'shared-runtime';

function Component(props) {
  const o = {};
  const x = <div>{props.value}</div>; // create within the range of x to group with x
  useHook(); // intersperse a hook call to prevent memoization of x
  o.value = props.value;

  const y = <div>{x}</div>;

  return <div>{y}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 'sathya'}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useHook } from "shared-runtime";

function Component(props) {
  const $ = _c(4);
  const o = {};
  let t0;
  if ($[0] !== props.value) {
    t0 = <div>{props.value}</div>;
    $[0] = props.value;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const x = t0;
  useHook();
  o.value = props.value;
  let t1;
  if ($[2] !== x) {
    const y = <div>{x}</div>;
    t1 = <div>{y}</div>;
    $[2] = x;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: "sathya" }],
};

```
      
### Eval output
(kind: ok) <div><div><div>sathya</div></div></div>