
## Input

```javascript
// @enableNewMutationAliasingModel
function Component({a, b}) {
  const x = {a};
  const y = [b];
  y.x = x;
  mutate(y);
  return <div>{x}</div>;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enableNewMutationAliasingModel
function Component(t0) {
  const $ = _c(3);
  const { a, b } = t0;
  let t1;
  if ($[0] !== a || $[1] !== b) {
    const x = { a };
    const y = [b];
    y.x = x;
    mutate(y);
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