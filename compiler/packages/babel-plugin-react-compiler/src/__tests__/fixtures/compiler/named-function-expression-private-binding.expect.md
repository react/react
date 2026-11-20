
## Input

```javascript
export function Component(recursive) {
  return function recursive(x) {
    const read = () => recursive;
    if (x) {
      return read;
    }
    recursive = null;
    return read;
  };
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
export function Component(recursive) {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = function recursive_0(x) {
      const read = () => recursive_0;
      if (x) {
        return read;
      }

      recursive_0 = null;
      return read;
    };
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

```
      
### Eval output
(kind: exception) Fixture not implemented