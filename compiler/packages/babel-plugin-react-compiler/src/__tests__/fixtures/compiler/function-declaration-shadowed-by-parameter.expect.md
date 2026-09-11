
## Input

```javascript
// @flow
function Greetings() {
  function greeting(greeting) {
    return 'Hello ' + greeting;
  }
  return <div>{greeting('World')}</div>;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Greetings() {
  const $ = _c(2);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = function greeting(greeting) {
      return "Hello " + greeting;
    };
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const greeting_0 = t0;
  let t1;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = <div>{greeting_0("World")}</div>;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

```
      
### Eval output
(kind: exception) Fixture not implemented