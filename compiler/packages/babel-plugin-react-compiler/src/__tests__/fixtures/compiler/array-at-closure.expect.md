
## Input

```javascript
function Component(props) {
  const x = foo(props.x);
  const fn = function () {
    const arr = [...bar(props)];
    return arr.at(x);
  };
  const fnResult = fn();
  return fnResult;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(5);
  let t0;
  if ($[0] !== props.x) {
    t0 = foo(props.x);
    $[0] = props.x;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const x = t0;
  let t1;
  if ($[2] !== props || $[3] !== x) {
    const fn = function () {
      const arr = [...bar(props)];
      return arr.at(x);
    };
    t1 = fn();
    $[2] = props;
    $[3] = x;
    $[4] = t1;
  } else {
    t1 = $[4];
  }
  const fnResult = t1;
  return fnResult;
}

```
      