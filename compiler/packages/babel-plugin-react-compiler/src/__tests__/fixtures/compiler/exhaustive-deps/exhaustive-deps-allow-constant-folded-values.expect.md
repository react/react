
## Input

```javascript
// @validateExhaustiveMemoizationDependencies

function Component() {
  const x = 0;
  const y = useMemo(() => {
    return [x];
    // x gets constant-folded but shouldn't count as extraneous,
    // it was referenced in the memo block
  }, [x]);
  return y;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateExhaustiveMemoizationDependencies

function Component() {
  const $ = _c(1);
  const x = 0;
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = [0];
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const y = t0;

  return y;
}

```
      
### Eval output
(kind: exception) Fixture not implemented