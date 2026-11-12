
## Input

```javascript
// @flow @compilationMode:"infer"

function Foo(props: {items: Array<{interface: string}>}) {
  const keys = props.items.map(x => x.interface);
  return <div>{keys.join(',')}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{items: [{interface: 'eth0'}, {interface: 'eth1'}]}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";

function Foo(props) {
  const $ = _c(4);
  let t0;
  if ($[0] !== props.items) {
    const keys = props.items.map(_temp);
    t0 = keys.join(",");
    $[0] = props.items;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  let t1;
  if ($[2] !== t0) {
    t1 = <div>{t0}</div>;
    $[2] = t0;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  return t1;
}
function _temp(x) {
  return x.interface;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{ items: [{ interface: "eth0" }, { interface: "eth1" }] }],
};

```
      
### Eval output
(kind: ok) <div>eth0,eth1</div>