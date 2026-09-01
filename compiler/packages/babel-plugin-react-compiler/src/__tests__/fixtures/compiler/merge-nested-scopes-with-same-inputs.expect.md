
## Input

```javascript
import {setProperty} from 'shared-runtime';

function Component(props) {
  // start of scope for y, depend on props.a
  let y = {};

  // nested scope for x, dependent on props.a
  const x = {};
  setProperty(x, props.a);
  // end of scope for x

  y.a = props.a;
  y.x = x;
  // end of scope for y

  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 42}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { setProperty } from "shared-runtime";

function Component(props) {
  const $ = _c(2);
  let y;
  if ($[0] !== props.a) {
    y = {};

    const x = {};
    setProperty(x, props.a);

    y.a = props.a;
    y.x = x;
    $[0] = props.a;
    $[1] = y;
  } else {
    y = $[1];
  }

  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ a: 42 }],
};

```
      
### Eval output
(kind: ok) {"a":42,"x":{"wat0":42}}