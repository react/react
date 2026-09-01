
## Input

```javascript
// @loggerTestOnly @validateNoJSXInTryStatements @outputMode:"lint"
import {identity} from 'shared-runtime';

function Component(props) {
  let el;
  try {
    let value;
    try {
      value = identity(props.foo);
    } catch {
      el = <div value={value} />;
    }
  } catch {
    return null;
  }
  return el;
}

```

## Code

```javascript
// @loggerTestOnly @validateNoJSXInTryStatements @outputMode:"lint"
import { identity } from "shared-runtime";

function Component(props) {
  let el;
  try {
    let value;
    try {
      value = identity(props.foo);
    } catch {
      el = <div value={value} />;
    }
  } catch {
    return null;
  }
  return el;
}

```

## Logs

```
{"kind":"CompileError","detail":{"category":"ErrorBoundaries","reason":"Avoid constructing JSX within try/catch","description":"React does not immediately render components when JSX is rendered, so any errors from this component will not be caught by the try/catch. To catch errors in rendering a given component, wrap that component in an error boundary. (https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)","severity":"Error","suggestions":null,"details":[{"kind":"error","loc":{"start":{"line":11,"column":11,"index":241},"end":{"line":11,"column":32,"index":262},"filename":"invalid-jsx-in-catch-in-outer-try-with-catch.ts"},"message":"Avoid constructing JSX within try/catch"}]},"fnLoc":null}
{"kind":"CompileSuccess","fnLoc":{"start":{"line":4,"column":0,"index":110},"end":{"line":17,"column":1,"index":317},"filename":"invalid-jsx-in-catch-in-outer-try-with-catch.ts"},"fnName":"Component","memoSlots":4,"memoBlocks":2,"memoValues":2,"prunedMemoBlocks":0,"prunedMemoValues":0}
```
      
### Eval output
(kind: exception) Fixture not implemented