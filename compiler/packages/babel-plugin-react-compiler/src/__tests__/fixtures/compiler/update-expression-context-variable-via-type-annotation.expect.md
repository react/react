
## Input

```javascript
// @flow @compilationMode(infer)
function Component(props: {data: Array<[string, mixed]>}) {
  let id = 0;
  for (const [key, value] of props.data) {
    const item = {
      key,
      id: '' + id++,
    };
  }
  const getIndex = ((): ((id: string) => number) => {
    return (id: string): number => 0;
  })();
  return <div />;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(1);
  let id = 0;
  for (const [key, value] of props.data) {
    id++;
  }
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
      
### Eval output
(kind: exception) Fixture not implemented