
## Input

```javascript
// @flow
function Foo() {
  try {
    doSomething();
  } catch (e) {
    foo(() => e);
  }
  return <div />;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Foo() {
  const $ = _c(1);
  try {
    doSomething();
  } catch (t0) {
    const e = t0;
    foo(() => e);
  }
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = <div />;
    $[0] = t1;
  } else {
    t1 = $[0];
  }
  return t1;
}

```
      
### Eval output
(kind: exception) Fixture not implemented