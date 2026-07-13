
## Input

```javascript
function Component({a, b}) {
  const y = {a};
  const x = {b};
  const f = () => {
    let z = null;
    while (z == null) {
      z = x;
    }
    // z is a phi with a backedge, and we don't realize it could be x,
    // and therefore fail to record a Capture x <- y effect for this
    // function expression
    z.y = y;
  };
  f();
  mutate(x);
  return <div>{x}</div>;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(t0) {
  const $ = _c(3);
  const { a, b } = t0;
  let t1;
  if ($[0] !== a || $[1] !== b) {
    const y = { a };
    const x = { b };
    const f = () => {
      let z = null;
      while (z == null) {
        z = x;
      }
      z.y = y;
    };
    f();
    mutate(x);
    t1 = <div>{x}</div>;
    $[0] = a;
    $[1] = b;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  return t1;
}

```
      
### Eval output
(kind: exception) Fixture not implemented