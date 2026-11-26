
## Input

```javascript
/**
 * Control for https://github.com/facebook/react/issues/38140
 *
 * `const` initialization (no reassignment): evaluation order is preserved when
 * a later element mutates the spread target (codegen may fold the snapshot).
 */
function Component() {
  const a = [1, 2, 3];
  const e = [...a, (a.push(5), a.length)];
  return e.join(',');
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; /**
 * Control for https://github.com/facebook/react/issues/38140
 *
 * `const` initialization (no reassignment): evaluation order is preserved when
 * a later element mutates the spread target (codegen may fold the snapshot).
 */
function Component() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    const a = [1, 2, 3];
    t0 = [...a, (a.push(5), a.length)];
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const e = t0;
  return e.join(",");
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```
      
### Eval output
(kind: ok) "1,2,3,4"