
## Input

```javascript
function Component(props) {
  const x = [0, ...props.foo, null, ...props.bar, 'z'];
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{foo: [1, 2, 3], bar: [4, 5, 6]}],
  isComponent: false,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(3);
  let t0;
  if ($[0] !== props.bar || $[1] !== props.foo) {
    t0 = [0, ...props.foo, null, ...props.bar, "z"];
    $[0] = props.bar;
    $[1] = props.foo;
    $[2] = t0;
  } else {
    t0 = $[2];
  }
  const x = t0;
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ foo: [1, 2, 3], bar: [4, 5, 6] }],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) [0,1,2,3,null,4,5,6,"z"]