
## Input

```javascript
function Foo({value}: {value: number}) {
  const factorial = (x: number) => {
    if (x <= 1) {
      return 1;
    } else {
      return x * factorial(x - 1);
    }
  };

  return factorial(value);
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{value: 3}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Foo(t0) {
  const $ = _c(2);
  const { value } = t0;
  let t1;
  if ($[0] !== value) {
    const factorial = (x) => {
      if (x <= 1) {
        return 1;
      } else {
        return x * factorial(x - 1);
      }
    };
    t1 = factorial(value);
    $[0] = value;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{ value: 3 }],
};

```
      
### Eval output
(kind: ok) 6