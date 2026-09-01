
## Input

```javascript
// @enableNewMutationAliasingModel
import {Stringify} from 'shared-runtime';

function Component({a, b}) {
  const x = {a, b};
  const y = [x];
  const x0 = y[0];
  const z = [x0];
  const x1 = z[0];
  x1.key = 'value';
  return <Stringify x={x} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 0, b: 1}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enableNewMutationAliasingModel
import { Stringify } from "shared-runtime";

function Component(t0) {
  const $ = _c(3);
  const { a, b } = t0;
  let t1;
  if ($[0] !== a || $[1] !== b) {
    const x = { a, b };
    const y = [x];
    const x0 = y[0];
    const z = [x0];
    const x1 = z[0];
    x1.key = "value";
    t1 = <Stringify x={x} />;
    $[0] = a;
    $[1] = b;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ a: 0, b: 1 }],
};

```
      
### Eval output
(kind: ok) <div>{"x":{"a":0,"b":1,"key":"value"}}</div>