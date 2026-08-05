
## Input

```javascript
// @compilationMode:"annotation"
for (
  var useFoo = function useFoo() {
    'use memo';
    return [1, 2, 3];
  };
  false;

) {}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @compilationMode:"annotation"
for (
  var useFoo = function useFoo() {
    "use memo";
    const $ = _c(1);
    let t0;
    if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
      t0 = [1, 2, 3];
      $[0] = t0;
    } else {
      t0 = $[0];
    }
    return t0;
  };
  false;

) {}

```
      
### Eval output
(kind: exception) Fixture not implemented