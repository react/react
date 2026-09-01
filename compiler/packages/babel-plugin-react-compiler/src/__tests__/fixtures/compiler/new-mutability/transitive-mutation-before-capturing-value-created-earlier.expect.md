
## Input

```javascript
// @enableNewMutationAliasingModel
function Component({a, b}) {
  const x = [a];
  const y = {b};
  mutate(y);
  y.x = x;
  return <div>{y}</div>;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enableNewMutationAliasingModel
function Component(t0) {
  const $ = _c(5);
  const { a, b } = t0;
  let t1;
  if ($[0] !== a) {
    t1 = [a];
    $[0] = a;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const x = t1;
  let t2;
  if ($[2] !== b || $[3] !== x) {
    const y = { b };
    mutate(y);
    y.x = x;
    t2 = <div>{y}</div>;
    $[2] = b;
    $[3] = x;
    $[4] = t2;
  } else {
    t2 = $[4];
  }
  return t2;
}

```
      
### Eval output
(kind: exception) Fixture not implemented