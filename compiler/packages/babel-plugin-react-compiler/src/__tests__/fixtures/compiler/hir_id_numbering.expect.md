
## Input

```javascript
// HIR Pattern: ID_NUMBERING_DIFF (14 files, 4%)
// Identifier IDs diverge (after normalization), with instruction kind changes
// Root cause: async function + try/catch + setTimeout scoping

export default function withRetries<T>(): Promise<T> {
  return new Promise((resolve, reject) => {
    async function exec(retries: number) {
      try {
        resolve(await fn());
      } catch (error: unknown) {
        if (retries > 0) {
          setTimeout(() => {}, timeoutMs);
          reject(error);
        }
      }
    }
  });
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // HIR Pattern: ID_NUMBERING_DIFF (14 files, 4%)
// Identifier IDs diverge (after normalization), with instruction kind changes
// Root cause: async function + try/catch + setTimeout scoping

export default function withRetries() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = new Promise(_temp);
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}
function _temp(resolve, reject) {}

```
      
### Eval output
(kind: exception) Fixture not implemented