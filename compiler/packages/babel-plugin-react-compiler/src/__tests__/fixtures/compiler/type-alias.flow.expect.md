
## Input

```javascript
// @flow
function Component(props) {
  type User = {name: string};
  const user: User = {name: props.name};
  return user;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{name: 'Mofei'}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(2);
  let t0;
  if ($[0] !== props.name) {
    t0 = { name: props.name };
    $[0] = props.name;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const user = t0;
  return user;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ name: "Mofei" }],
};

```
      
### Eval output
(kind: ok) {"name":"Mofei"}