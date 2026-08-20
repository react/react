
## Input

```javascript
function useFoo(setOne: boolean) {
  let x;
  let y;
  let z;
  if (setOne) {
    x = y = z = 1;
  } else {
    x = 2;
    y = 3;
    z = 5;
  }
  return {x, y, z};
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [true],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function useFoo(setOne) {
  const $ = _c(4);
  let x;
  let y;
  let z;
  if (setOne) {
    x = y = z = 1;
  } else {
    x = 2;
    y = 3;
    z = 5;
  }
  let t0;
  if ($[0] !== x || $[1] !== y || $[2] !== z) {
    t0 = { x, y, z };
    $[0] = x;
    $[1] = y;
    $[2] = z;
    $[3] = t0;
  } else {
    t0 = $[3];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [true],
};

```
      
### Eval output
(kind: ok) {"x":1,"y":1,"z":1}