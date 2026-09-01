
## Input

```javascript
// @enableNewMutationAliasingModel
function Component({a, b, c}) {
  const x = [];
  x.push(a);
  const merged = {b}; // could be mutated by mutate(x) below
  x.push(merged);
  mutate(x);
  const independent = {c}; // can't be later mutated
  x.push(independent);
  return <Foo value={x} />;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enableNewMutationAliasingModel
function Component(t0) {
  const $ = _c(6);
  const { a, b, c } = t0;
  let t1;
  if ($[0] !== a || $[1] !== b || $[2] !== c) {
    const x = [];
    x.push(a);
    const merged = { b };
    x.push(merged);
    mutate(x);
    let t2;
    if ($[4] !== c) {
      t2 = { c };
      $[4] = c;
      $[5] = t2;
    } else {
      t2 = $[5];
    }
    const independent = t2;
    x.push(independent);
    t1 = <Foo value={x} />;
    $[0] = a;
    $[1] = b;
    $[2] = c;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  return t1;
}

```
      
### Eval output
(kind: exception) Fixture not implemented