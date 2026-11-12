
## Input

```javascript
// Template literal constant folding uses format_js_number to convert
// numbers to strings. Without the shared implementation, large numbers
// may format incorrectly (e.g. 1e21 as "1e21" instead of "1e+21").

function Component() {
  const x = `value is ${1e21}`;
  return <div>{x}</div>;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // Template literal constant folding uses format_js_number to convert
// numbers to strings. Without the shared implementation, large numbers
// may format incorrectly (e.g. 1e21 as "1e21" instead of "1e+21").

function Component() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = <div>{"value is 1e+21"}</div>;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

```
      
### Eval output
(kind: exception) Fixture not implemented