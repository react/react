
## Input

```javascript
import {identity} from 'shared-runtime';

function Component(props) {
  let [x] = props.value;
  const foo = () => {
    x = identity(props.value[0]);
  };
  foo();
  return <div>{x}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: [42]}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { identity } from "shared-runtime";

function Component(props) {
  const $ = _c(4);
  let x;
  if ($[0] !== props.value) {
    const [t0] = props.value;
    x = t0;
    const foo = () => {
      x = identity(props.value[0]);
    };

    foo();
    $[0] = props.value;
    $[1] = x;
  } else {
    x = $[1];
  }
  let t0;
  if ($[2] !== x) {
    t0 = <div>{x}</div>;
    $[2] = x;
    $[3] = t0;
  } else {
    t0 = $[3];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: [42] }],
};

```
      
### Eval output
(kind: ok) <div>42</div>