
## Input

```javascript
// @flow
// Match expression with optional chaining in discriminant.
// Hermes desugars this into a synthetic IIFE that captures `y` from the outer scope.
// The IIFE has start=end=0, requiring synthetic scope resolution to find captured context.

export default component MatchExprCapturedVar(x: ?{v: string}, y: number) {
  return match (x?.v) {
    'a' => y + 1,
    _ => y + 2,
  };
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";

export default function MatchExprCapturedVar(t0) {
  const $ = _c(2);
  const { x, y } = t0;
  let t1;
  if ($[0] !== y) {
    t1 = ($$gen$m0) => {
      if ($$gen$m0 === "a") {
        return y + 1;
      }
      return y + 2;
    };
    $[0] = y;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1(x?.v);
}

```
      
### Eval output
(kind: exception) Fixture not implemented