
## Input

```javascript
// @validateExhaustiveMemoizationDependencies:false
function Component(props) {
  const [a, b] = useMemo(() => {
    const items = [];
    const a = makeObject(props.a);
    const b = makeObject(props.b);
    return [a, b];
  });
  return [a, b];
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateExhaustiveMemoizationDependencies:false
function Component(props) {
  const $ = _c(10);
  let t0;
  if ($[0] !== props.a) {
    t0 = makeObject(props.a);
    $[0] = props.a;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const a = t0;
  let t1;
  if ($[2] !== props.b) {
    t1 = makeObject(props.b);
    $[2] = props.b;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  const b = t1;
  let t2;
  if ($[4] !== a || $[5] !== b) {
    t2 = [a, b];
    $[4] = a;
    $[5] = b;
    $[6] = t2;
  } else {
    t2 = $[6];
  }
  const [a_0, b_0] = t2;
  let t3;
  if ($[7] !== a_0 || $[8] !== b_0) {
    t3 = [a_0, b_0];
    $[7] = a_0;
    $[8] = b_0;
    $[9] = t3;
  } else {
    t3 = $[9];
  }
  return t3;
}

```
      