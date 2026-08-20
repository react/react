
## Input

```javascript
// @loggerTestOnly @validateNoJSXInTryStatements @outputMode:"lint"
function Component(props) {
  let el;
  try {
    el = <div />;
  } catch {
    return null;
  }
  return el;
}

```

## Code

```javascript
// @loggerTestOnly @validateNoJSXInTryStatements @outputMode:"lint"
function Component(props) {
  let el;
  try {
    el = <div />;
  } catch {
    return null;
  }
  return el;
}

```

## Logs

```
{"kind":"CompileError","detail":{"category":"ErrorBoundaries","reason":"Avoid constructing JSX within try/catch","description":"React does not immediately render components when JSX is rendered, so any errors from this component will not be caught by the try/catch. To catch errors in rendering a given component, wrap that component in an error boundary. (https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)","severity":"Error","suggestions":null,"details":[{"kind":"error","loc":{"start":{"line":5,"column":9,"index":123},"end":{"line":5,"column":16,"index":130},"filename":"invalid-jsx-in-try-with-catch.ts"},"message":"Avoid constructing JSX within try/catch"}]},"fnLoc":null}
{"kind":"CompileSuccess","fnLoc":{"start":{"line":2,"column":0,"index":68},"end":{"line":10,"column":1,"index":179},"filename":"invalid-jsx-in-try-with-catch.ts"},"fnName":"Component","memoSlots":1,"memoBlocks":1,"memoValues":1,"prunedMemoBlocks":0,"prunedMemoValues":0}
```
      
### Eval output
(kind: exception) Fixture not implemented