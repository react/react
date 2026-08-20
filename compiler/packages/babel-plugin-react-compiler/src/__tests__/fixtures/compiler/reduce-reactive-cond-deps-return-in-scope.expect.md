
## Input

```javascript
function useFoo({obj, objIsNull}) {
  const x = [];
  if (objIsNull) {
    return;
  } else {
    x.push(obj.a);
  }
  x.push(obj.b);
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
  const $ = _c(4);
  const { obj, objIsNull } = t0;
  let t1;
  let x;
  if ($[0] !== obj || $[1] !== objIsNull) {
    t1 = Symbol.for("react.early_return_sentinel");
    bb0: {
      x = [];
      if (objIsNull) {
        t1 = undefined;
        break bb0;
      } else {
        x.push(obj.a);
      }

      x.push(obj.b);
    }
    $[0] = obj;
    $[1] = objIsNull;
    $[2] = t1;
    $[3] = x;
  } else {
    t1 = $[2];
    x = $[3];
  }
  if (t1 !== Symbol.for("react.early_return_sentinel")) {
    return t1;
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
(kind: ok) 
[2,null]