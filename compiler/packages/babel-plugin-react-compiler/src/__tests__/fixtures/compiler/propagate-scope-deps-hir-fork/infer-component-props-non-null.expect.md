
## Input

```javascript
// @enablePropagateDepsInHIR
import {identity, Stringify} from 'shared-runtime';

function Foo(props) {
  /**
   * props.value should be inferred as the dependency of this scope
   * since we know that props is safe to read from (i.e. non-null)
   * as it is arg[0] of a component function
   */
  const arr = [];
  if (props.cond) {
    arr.push(identity(props.value));
  }
  return <Stringify arr={arr} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{value: 2, cond: true}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enablePropagateDepsInHIR
import { identity, Stringify } from "shared-runtime";

function Foo(props) {
  const $ = _c(5);
  let t0;
  if ($[0] !== props.cond || $[1] !== props.value) {
    const arr = [];
    if (props.cond) {
      let t1;
      if ($[3] !== props.value) {
        t1 = identity(props.value);
        $[3] = props.value;
        $[4] = t1;
      } else {
        t1 = $[4];
      }
      arr.push(t1);
    }
    t0 = <Stringify arr={arr} />;
    $[0] = props.cond;
    $[1] = props.value;
    $[2] = t0;
  } else {
    t0 = $[2];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{ value: 2, cond: true }],
};

```
      
### Eval output
(kind: ok) <div>{"arr":[2]}</div>