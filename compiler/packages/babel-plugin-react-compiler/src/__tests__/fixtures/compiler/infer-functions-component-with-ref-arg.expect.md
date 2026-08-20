
## Input

```javascript
// @compilationMode:"infer"

function Foo({}, ref) {
  return <div ref={ref} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @compilationMode:"infer"

function Foo(t0, ref) {
  const $ = _c(2);
  let t1;
  if ($[0] !== ref) {
    t1 = <div ref={ref} />;
    $[0] = ref;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{}],
};

```
      
### Eval output
(kind: ok) <div></div>