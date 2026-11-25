
## Input

```javascript
const YearsAndMonthsSince = () => {
  const diff = foo();
  const months = Math.floor(diff.bar());
  return <>{months}</>;
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
const YearsAndMonthsSince = () => {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    const diff = foo();
    const months = Math.floor(diff.bar());
    t0 = <>{months}</>;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
};

```
      
### Eval output
(kind: exception) Fixture not implemented