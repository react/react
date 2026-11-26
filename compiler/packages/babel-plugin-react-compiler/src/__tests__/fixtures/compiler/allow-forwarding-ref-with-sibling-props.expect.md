
## Input

```javascript
// @validateRefAccessDuringRender
function Component(props) {
  return <div ref={props.ref}>{props.value}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ref: {current: null}, value: 'forwarded value'}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateRefAccessDuringRender
function Component(props) {
  const $ = _c(3);
  let t0;
  if ($[0] !== props.ref || $[1] !== props.value) {
    t0 = <div ref={props.ref}>{props.value}</div>;
    $[0] = props.ref;
    $[1] = props.value;
    $[2] = t0;
  } else {
    t0 = $[2];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ ref: { current: null }, value: "forwarded value" }],
};

```
      
### Eval output
(kind: ok) <div>forwarded value</div>