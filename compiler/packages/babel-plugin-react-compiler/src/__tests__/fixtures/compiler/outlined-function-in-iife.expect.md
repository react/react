
## Input

```javascript
function Component() {
  return (function () {
    function Inner() {
      return <div onClick={() => null} />;
    }
    return <Inner />;
  })();
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    const Inner = function Inner() {
      return <div onClick={_temp} />;
    };
    t0 = <Inner />;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}
function _temp() {
  return null;
}

```
      
### Eval output
(kind: exception) Fixture not implemented