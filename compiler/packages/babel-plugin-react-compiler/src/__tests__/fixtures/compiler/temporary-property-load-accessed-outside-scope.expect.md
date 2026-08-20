
## Input

```javascript
function Component(props) {
  const maybeMutable = new MaybeMutable();
  let x = props.value;
  return [x, maybeMutate(maybeMutable)];
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(6);
  let t0;
  let t1;
  if ($[0] !== props.value) {
    const maybeMutable = new MaybeMutable();
    const x = props.value;
    t0 = x;
    t1 = maybeMutate(maybeMutable);
    $[0] = props.value;
    $[1] = t0;
    $[2] = t1;
  } else {
    t0 = $[1];
    t1 = $[2];
  }
  let t2;
  if ($[3] !== t0 || $[4] !== t1) {
    t2 = [t0, t1];
    $[3] = t0;
    $[4] = t1;
    $[5] = t2;
  } else {
    t2 = $[5];
  }
  return t2;
}

```
      