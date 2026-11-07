
## Input

```javascript
// Per spec, the object and computed property of a member expression lvalue
// are evaluated before the right-hand side. `a[i++] = i` must store into
// index 0 while the rhs observes the incremented value of `i`.
function Component() {
  const a = [0, 0];
  let i = 0;
  a[i++] = i;

  const b = [0, 0];
  let j = 0;
  b[j] = ++j;

  const c = [0, 0];
  let k = 0;
  c[k] = (k++, k);

  return [a, b, c];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: false,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // Per spec, the object and computed property of a member expression lvalue
// are evaluated before the right-hand side. `a[i++] = i` must store into
// index 0 while the rhs observes the incremented value of `i`.
function Component() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    const a = [0, 0];
    a[0] = 1;
    const b = [0, 0];
    let j = 0;
    b[0] = ++j;
    const c = [0, 0];
    c[0] = 1;
    t0 = [a, b, c];
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) [[1,0],[1,0],[1,0]]