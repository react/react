
## Input

```javascript
// @validateNoFreezingKnownMutableFunctions

function useFoo() {
  const cache = new Map();
  const handlers = {
    mutates() {
      cache.set('key', 'value');
    },
    readOnly() {},
  };
  // Only `mutates` is a known-mutable function, `readOnly` is safe to pass.
  useHook(handlers.readOnly);
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateNoFreezingKnownMutableFunctions

function useFoo() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    const cache = new Map();
    t0 = {
      mutates() {
        cache.set("key", "value");
      },
      readOnly() {},
    };
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const handlers = t0;

  useHook(handlers.readOnly);
}

```
      
### Eval output
(kind: exception) Fixture not implemented