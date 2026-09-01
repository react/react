
## Input

```javascript
// @enableNewMutationAliasingModel
function Component({a, b}) {
  const x = {};
  const y = {x};
  const z = y.x;
  z.true = false;
  return <div>{z}</div>;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enableNewMutationAliasingModel
function Component(t0) {
  const $ = _c(1);
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    const x = {};
    const y = { x };
    const z = y.x;
    z.true = false;
    t1 = <div>{z}</div>;
    $[0] = t1;
  } else {
    t1 = $[0];
  }
  return t1;
}

```
      
### Eval output
(kind: exception) Fixture not implemented