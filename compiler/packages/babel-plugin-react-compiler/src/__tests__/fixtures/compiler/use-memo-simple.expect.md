
## Input

```javascript
function Component(props) {
  'use memo';
  let x = [props.foo];
  return <div x={x}>"foo"</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{foo: 1}],
  isComponent: true,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  "use memo";
  const $ = _c(2);
  let t0;
  if ($[0] !== props.foo) {
    const x = [props.foo];
    t0 = <div x={x}>"foo"</div>;
    $[0] = props.foo;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ foo: 1 }],
  isComponent: true,
};

```
      
### Eval output
(kind: ok) <div x="1">"foo"</div>