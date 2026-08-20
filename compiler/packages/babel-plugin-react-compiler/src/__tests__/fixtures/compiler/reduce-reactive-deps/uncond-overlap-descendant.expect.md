
## Input

```javascript
// Test that we correctly track a subpath if the subpath itself is accessed as
// a dependency
function TestOverlappingDescendantTracked(props) {
  let x = {};
  x.b = props.a.b.c;
  x.c = props.a.b.c.x.y;
  x.a = props.a;
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: TestOverlappingDescendantTracked,
  params: [{a: {b: {c: {x: {y: 5}}}}}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // Test that we correctly track a subpath if the subpath itself is accessed as
// a dependency
function TestOverlappingDescendantTracked(props) {
  const $ = _c(2);
  let x;
  if ($[0] !== props.a) {
    x = {};
    x.b = props.a.b.c;
    x.c = props.a.b.c.x.y;
    x.a = props.a;
    $[0] = props.a;
    $[1] = x;
  } else {
    x = $[1];
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: TestOverlappingDescendantTracked,
  params: [{ a: { b: { c: { x: { y: 5 } } } } }],
};

```
      
### Eval output
(kind: ok) {"b":{"x":{"y":5}},"c":5,"a":{"b":{"c":"[[ cyclic ref *1 ]]"}}}