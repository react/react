
## Input

```javascript
// Test that we correctly track a subpath if the subpath itself is accessed as
// a dependency
function TestOverlappingTracked(props) {
  let x = {};
  x.b = props.a.b;
  x.c = props.a.c;
  x.a = props.a;
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: TestOverlappingTracked,
  params: [{a: {c: 2}}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // Test that we correctly track a subpath if the subpath itself is accessed as
// a dependency
function TestOverlappingTracked(props) {
  const $ = _c(2);
  let x;
  if ($[0] !== props.a) {
    x = {};
    x.b = props.a.b;
    x.c = props.a.c;
    x.a = props.a;
    $[0] = props.a;
    $[1] = x;
  } else {
    x = $[1];
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: TestOverlappingTracked,
  params: [{ a: { c: 2 } }],
};

```
      
### Eval output
(kind: ok) {"c":2,"a":{"c":2}}