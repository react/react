
## Input

```javascript
import {makeArray} from 'shared-runtime';

function Component(props) {
  let x = [];
  if (props.cond) {
    x.push(props.a);
    // oops no memo!
    return x;
  } else {
    return makeArray(props.b);
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  sequentialRenders: [
    // pattern 1
    {cond: true, a: 42},
    {cond: true, a: 42},
    // pattern 2
    {cond: false, b: 3.14},
    {cond: false, b: 3.14},
    // pattern 1
    {cond: true, a: 42},
    // pattern 2
    {cond: false, b: 3.14},
    // pattern 1
    {cond: true, a: 42},
    // pattern 2
    {cond: false, b: 3.14},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { makeArray } from "shared-runtime";

function Component(props) {
  const $ = _c(6);
  let t0;
  if ($[0] !== props.a || $[1] !== props.b || $[2] !== props.cond) {
    t0 = Symbol.for("react.early_return_sentinel");
    bb0: {
      const x = [];
      if (props.cond) {
        x.push(props.a);
        t0 = x;
        break bb0;
      } else {
        let t1;
        if ($[4] !== props.b) {
          t1 = makeArray(props.b);
          $[4] = props.b;
          $[5] = t1;
        } else {
          t1 = $[5];
        }
        t0 = t1;
        break bb0;
      }
    }
    $[0] = props.a;
    $[1] = props.b;
    $[2] = props.cond;
    $[3] = t0;
  } else {
    t0 = $[3];
  }
  if (t0 !== Symbol.for("react.early_return_sentinel")) {
    return t0;
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  sequentialRenders: [
    // pattern 1
    { cond: true, a: 42 },
    { cond: true, a: 42 },
    // pattern 2
    { cond: false, b: 3.14 },
    { cond: false, b: 3.14 },
    // pattern 1
    { cond: true, a: 42 },
    // pattern 2
    { cond: false, b: 3.14 },
    // pattern 1
    { cond: true, a: 42 },
    // pattern 2
    { cond: false, b: 3.14 },
  ],
};

```
      
### Eval output
(kind: ok) [42]
[42]
[3.14]
[3.14]
[42]
[3.14]
[42]
[3.14]