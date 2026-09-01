
## Input

```javascript
// @enableNewMutationAliasingModel
function Component({a, b, c}) {
  const x = [a, b];
  const f = () => {
    maybeMutate(x);
    // different dependency to force this not to merge with x's scope
    console.log(c);
  };
  return <Foo onClick={f} value={x} />;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enableNewMutationAliasingModel
function Component(t0) {
  const $ = _c(9);
  const { a, b, c } = t0;
  let t1;
  if ($[0] !== a || $[1] !== b) {
    t1 = [a, b];
    $[0] = a;
    $[1] = b;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  const x = t1;
  let t2;
  if ($[3] !== c || $[4] !== x) {
    t2 = () => {
      maybeMutate(x);

      console.log(c);
    };
    $[3] = c;
    $[4] = x;
    $[5] = t2;
  } else {
    t2 = $[5];
  }
  const f = t2;
  let t3;
  if ($[6] !== f || $[7] !== x) {
    t3 = <Foo onClick={f} value={x} />;
    $[6] = f;
    $[7] = x;
    $[8] = t3;
  } else {
    t3 = $[8];
  }
  return t3;
}

```
      
### Eval output
(kind: exception) Fixture not implemented