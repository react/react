
## Input

```javascript
function Component(props) {
  const obj = {
    process(x) {
      'use no memo';
      const inner = y => y + 1;
      return inner(x);
    },
  };
  return obj.process(props.value);
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 42}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(2);
  let t0;
  if ($[0] !== props.value) {
    const obj = {
      process(x) {
        "use no memo";
        const inner = (y) => y + 1;
        return inner(x);
      },
    };
    t0 = obj.process(props.value);
    $[0] = props.value;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: 42 }],
};

```
      
### Eval output
(kind: ok) 43