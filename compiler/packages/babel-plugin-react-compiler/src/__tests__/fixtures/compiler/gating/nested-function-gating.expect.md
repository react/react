
## Input

```javascript
// @gating @compilationMode:"annotation"
if (globalThis.__DEV__) {
  function useFoo() {
    'use memo';
    return [1, 2, 3];
  }
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { isForgetEnabled_Fixtures } from "ReactForgetFeatureFlag"; // @gating @compilationMode:"annotation"
if (globalThis.__DEV__) {
  const useFoo = isForgetEnabled_Fixtures()
    ? function useFoo() {
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
      }
    : function useFoo() {
        "use memo";
        return [1, 2, 3];
      };
}

```
      
### Eval output
(kind: exception) Fixture not implemented