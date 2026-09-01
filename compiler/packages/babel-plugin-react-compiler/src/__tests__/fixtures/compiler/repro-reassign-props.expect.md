
## Input

```javascript
import {Stringify, useIdentity} from 'shared-runtime';

function Component({other, ...props}, ref) {
  [props, ref] = useIdentity([props, ref]);
  return <Stringify props={props} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 0, b: 'hello', children: <div>Hello</div>}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify, useIdentity } from "shared-runtime";

function Component(t0, ref) {
  const $ = _c(7);
  let props;
  if ($[0] !== t0) {
    let { other, ...t1 } = t0;
    props = t1;
    $[0] = t0;
    $[1] = props;
  } else {
    props = $[1];
  }
  let t1;
  if ($[2] !== props || $[3] !== ref) {
    t1 = [props, ref];
    $[2] = props;
    $[3] = ref;
    $[4] = t1;
  } else {
    t1 = $[4];
  }
  [props, ref] = useIdentity(t1);
  let t2;
  if ($[5] !== props) {
    t2 = <Stringify props={props} />;
    $[5] = props;
    $[6] = t2;
  } else {
    t2 = $[6];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ a: 0, b: "hello", children: <div>Hello</div> }],
};

```
      
### Eval output
(kind: ok) <div>{"props":{"a":0,"b":"hello","children":{"type":"div","key":null,"props":{"children":"Hello"},"_owner":"[[ cyclic ref *3 ]]","_store":{}}}}</div>