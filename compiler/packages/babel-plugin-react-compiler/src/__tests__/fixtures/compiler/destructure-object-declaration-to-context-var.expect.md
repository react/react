
## Input

```javascript
import {identity} from 'shared-runtime';

function Component(props) {
  let {x} = props;
  const foo = () => {
    x = identity(props.x);
  };
  foo();
  return {x};
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{x: 42}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { identity } from "shared-runtime";

function Component(props) {
  const $ = _c(4);
  let x;
  if ($[0] !== props) {
    const { x: t0 } = props;
    x = t0;
    const foo = () => {
      x = identity(props.x);
    };

    foo();
    $[0] = props;
    $[1] = x;
  } else {
    x = $[1];
  }
  let t0;
  if ($[2] !== x) {
    t0 = { x };
    $[2] = x;
    $[3] = t0;
  } else {
    t0 = $[3];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ x: 42 }],
};

```
      
### Eval output
(kind: ok) {"x":42}