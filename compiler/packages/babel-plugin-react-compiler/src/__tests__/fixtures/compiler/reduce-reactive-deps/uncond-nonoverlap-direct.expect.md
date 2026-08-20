
## Input

```javascript
// Test that we can track non-overlapping dependencies separately.
// (not needed for correctness but for dependency granularity)
function TestNonOverlappingTracked(props) {
  let x = {};
  x.b = props.a.b;
  x.c = props.a.c;
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: TestNonOverlappingTracked,
  params: [{a: {b: 2, c: 3}}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // Test that we can track non-overlapping dependencies separately.
// (not needed for correctness but for dependency granularity)
function TestNonOverlappingTracked(props) {
  const $ = _c(3);
  let x;
  if ($[0] !== props.a.b || $[1] !== props.a.c) {
    x = {};
    x.b = props.a.b;
    x.c = props.a.c;
    $[0] = props.a.b;
    $[1] = props.a.c;
    $[2] = x;
  } else {
    x = $[2];
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: TestNonOverlappingTracked,
  params: [{ a: { b: 2, c: 3 } }],
};

```
      
### Eval output
(kind: ok) {"b":2,"c":3}