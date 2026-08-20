
## Input

```javascript
// Test that we can track non-overlapping dependencies separately.
// (not needed for correctness but for dependency granularity)
function TestNonOverlappingDescendantTracked(props) {
  let x = {};
  x.a = props.a.x.y;
  x.b = props.b;
  x.c = props.a.c.x.y.z;
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: TestNonOverlappingDescendantTracked,
  params: [{a: {x: {}, c: {x: {y: {z: 3}}}}}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // Test that we can track non-overlapping dependencies separately.
// (not needed for correctness but for dependency granularity)
function TestNonOverlappingDescendantTracked(props) {
  const $ = _c(4);
  let x;
  if ($[0] !== props.a.c.x.y.z || $[1] !== props.a.x.y || $[2] !== props.b) {
    x = {};
    x.a = props.a.x.y;
    x.b = props.b;
    x.c = props.a.c.x.y.z;
    $[0] = props.a.c.x.y.z;
    $[1] = props.a.x.y;
    $[2] = props.b;
    $[3] = x;
  } else {
    x = $[3];
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: TestNonOverlappingDescendantTracked,
  params: [{ a: { x: {}, c: { x: { y: { z: 3 } } } } }],
};

```
      
### Eval output
(kind: ok) {"c":3}