
## Input

```javascript
function useHook(end) {
  const log = [];
  for (let i = 0; i < end + 1; i++) {
    log.push(`${i} @A`);
    bb0: {
      if (i === end) {
        break bb0;
      }
      log.push(`${i} @B`);
    }
    log.push(`${i} @C`);
  }
  return log;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useHook,
  params: [1],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function useHook(end) {
  const $ = _c(2);
  let log;
  if ($[0] !== end) {
    log = [];
    for (let i = 0; i < end + 1; i++) {
      log.push(`${i} @A`);
      bb0: {
        if (i === end) {
          break bb0;
        }

        log.push(`${i} @B`);
      }

      log.push(`${i} @C`);
    }
    $[0] = end;
    $[1] = log;
  } else {
    log = $[1];
  }

  return log;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useHook,
  params: [1],
};

```
      
### Eval output
(kind: ok) ["0 @A","0 @B","0 @C","1 @A","1 @C"]