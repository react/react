
## Input

```javascript
// @flow
// Match statement with const arrow function that references itself inside an arm.
// Hermes desugars the match into a labeled block with synthetic if-bodies at
// position 0. The const declaration needs correct block scope resolution (not
// the Program scope) to avoid broken hoisting.

export default component MatchStmtSelfRefConst(x: string) {
  match (x) {
    'a' => {
      const handler = () => {
        handler();
      };
      document.addEventListener('click', handler);
    }
    _ => {}
  }
  return <div />;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";

export default function MatchStmtSelfRefConst(t0) {
  const $ = _c(1);
  const { x } = t0;
  bb0: if (x === "a") {
    const handler = () => {
      handler();
    };

    document.addEventListener("click", handler);
    break bb0;
  }
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = <div />;
    $[0] = t1;
  } else {
    t1 = $[0];
  }
  return t1;
}

```
      
### Eval output
(kind: exception) Fixture not implemented