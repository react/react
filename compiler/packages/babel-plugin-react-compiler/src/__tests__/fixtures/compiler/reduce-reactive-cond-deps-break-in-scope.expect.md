
## Input

```javascript
function useFoo({obj, objIsNull}) {
  const x = [];
  b0: {
    if (objIsNull) {
      break b0;
    } else {
      x.push(obj.a);
    }
    x.push(obj.b);
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{obj: null, objIsNull: true}],
  sequentialRenders: [
    {obj: null, objIsNull: true},
    {obj: {a: 2}, objIsNull: false},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function useFoo(t0) {
  const $ = _c(3);
  const { obj, objIsNull } = t0;
  let x;
  if ($[0] !== obj || $[1] !== objIsNull) {
    x = [];
    bb0: {
      if (objIsNull) {
        break bb0;
      } else {
        x.push(obj.a);
      }

      x.push(obj.b);
    }
    $[0] = obj;
    $[1] = objIsNull;
    $[2] = x;
  } else {
    x = $[2];
  }

  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{ obj: null, objIsNull: true }],
  sequentialRenders: [
    { obj: null, objIsNull: true },
    { obj: { a: 2 }, objIsNull: false },
  ],
};

```
      
### Eval output
(kind: ok) []
[2,null]