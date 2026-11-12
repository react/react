
## Input

```javascript
// @validateNoVoidUseMemo @loggerTestOnly
function Component() {
  const value = useMemo(() => {
    console.log('computing');
  }, []);
  const value2 = React.useMemo(() => {
    console.log('computing');
  }, []);
  return (
    <div>
      {value}
      {value2}
    </div>
  );
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateNoVoidUseMemo @loggerTestOnly
function Component() {
  const $ = _c(1);

  console.log("computing");

  console.log("computing");
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = (
      <div>
        {undefined}
        {undefined}
      </div>
    );
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

```

## Logs

```
{"kind":"CompileError","detail":{"category":"VoidUseMemo","reason":"useMemo() callbacks must return a value","description":"This useMemo() callback doesn't return a value. useMemo() is for computing and caching values, not for arbitrary side effects","severity":"Error","suggestions":null,"details":[{"kind":"error","loc":{"start":{"line":3,"column":24,"index":89},"end":{"line":5,"column":3,"index":130},"filename":"invalid-useMemo-no-return-value.ts"},"message":"useMemo() callbacks must return a value"}]},"fnLoc":null}
{"kind":"CompileError","detail":{"category":"VoidUseMemo","reason":"useMemo() callbacks must return a value","description":"This useMemo() callback doesn't return a value. useMemo() is for computing and caching values, not for arbitrary side effects","severity":"Error","suggestions":null,"details":[{"kind":"error","loc":{"start":{"line":6,"column":31,"index":168},"end":{"line":8,"column":3,"index":209},"filename":"invalid-useMemo-no-return-value.ts"},"message":"useMemo() callbacks must return a value"}]},"fnLoc":null}
{"kind":"CompileSuccess","fnLoc":{"start":{"line":2,"column":0,"index":42},"end":{"line":15,"column":1,"index":283},"filename":"invalid-useMemo-no-return-value.ts"},"fnName":"Component","memoSlots":1,"memoBlocks":1,"memoValues":1,"prunedMemoBlocks":0,"prunedMemoValues":0}
```
      
### Eval output
(kind: exception) Fixture not implemented