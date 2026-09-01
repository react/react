
## Input

```javascript
// @loggerTestOnly @outputMode:"lint"
function Component() {
  return null;
}

export const ENTRYPOINT = {
  fn: Component,
  params: [{onChange: () => {}}],
};

```

## Code

```javascript
// @loggerTestOnly @outputMode:"lint"
function Component() {
  return null;
}

export const ENTRYPOINT = {
  fn: Component,
  params: [{ onChange: () => {} }],
};

```

## Logs

```
{"kind":"CompileSuccess","fnLoc":{"start":{"line":2,"column":0,"index":38},"end":{"line":4,"column":1,"index":77},"filename":"fn-name-no-leak-to-nested-arrow.ts"},"fnName":"Component","memoSlots":0,"memoBlocks":0,"memoValues":0,"prunedMemoBlocks":0,"prunedMemoValues":0}
{"kind":"CompileSuccess","fnLoc":{"start":{"line":8,"column":22,"index":146},"end":{"line":8,"column":30,"index":154},"filename":"fn-name-no-leak-to-nested-arrow.ts"},"fnName":null,"memoSlots":0,"memoBlocks":0,"memoValues":0,"prunedMemoBlocks":0,"prunedMemoValues":0}
```
      
### Eval output
(kind: exception) Fixture not implemented