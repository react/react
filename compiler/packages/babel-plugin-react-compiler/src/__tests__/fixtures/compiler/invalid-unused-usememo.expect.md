
## Input

```javascript
// @validateNoVoidUseMemo @loggerTestOnly
function Component() {
  useMemo(() => {
    return [];
  }, []);
  return <div />;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateNoVoidUseMemo @loggerTestOnly
function Component() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = <div />;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

```

## Logs

```
{"kind":"CompileError","detail":{"category":"VoidUseMemo","reason":"useMemo() result is unused","description":"This useMemo() value is unused. useMemo() is for computing and caching values, not for arbitrary side effects","severity":"Error","suggestions":null,"details":[{"kind":"error","loc":{"start":{"line":3,"column":2,"index":67},"end":{"line":3,"column":9,"index":74},"filename":"invalid-unused-usememo.ts","identifierName":"useMemo"},"message":"useMemo() result is unused"}]},"fnLoc":null}
{"kind":"CompileSuccess","fnLoc":{"start":{"line":2,"column":0,"index":42},"end":{"line":7,"column":1,"index":127},"filename":"invalid-unused-usememo.ts"},"fnName":"Component","memoSlots":1,"memoBlocks":1,"memoValues":1,"prunedMemoBlocks":0,"prunedMemoValues":0}
```
      
### Eval output
(kind: exception) Fixture not implemented