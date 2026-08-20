
## Input

```javascript
function component(props) {
  // The mutable range for a extens the entire body.
  // commenting out the last line of InferMutableRanges fixes it.
  // my guess of what's going on is that a is aliased into the return value object literal,
  // and that alias makes it look like the range of a needs to be extended to that point.
  // but what's weird is that the end of a's range doesn't quite extend to the object.
  let a = props.a || (props.b && props.c && props.d);
  let b = (props.a && props.b && props.c) || props.d;
  return {a, b};
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function component(props) {
  const $ = _c(3);

  const a = props.a || (props.b && props.c && props.d);
  const b = (props.a && props.b && props.c) || props.d;
  let t0;
  if ($[0] !== a || $[1] !== b) {
    t0 = { a, b };
    $[0] = a;
    $[1] = b;
    $[2] = t0;
  } else {
    t0 = $[2];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: ["TodoAdd"],
  isComponent: "TodoAdd",
};

```
      