
## Input

```javascript
const MyComponent = function helper({x}) {
  return <div>{x * 2}</div>;
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
const MyComponent = function helper(t0) {
  const $ = _c(2);
  const { x } = t0;
  const t1 = x * 2;
  let t2;
  if ($[0] !== t1) {
    t2 = <div>{t1}</div>;
    $[0] = t1;
    $[1] = t2;
  } else {
    t2 = $[1];
  }
  return t2;
};

```
      
### Eval output
(kind: exception) Fixture not implemented