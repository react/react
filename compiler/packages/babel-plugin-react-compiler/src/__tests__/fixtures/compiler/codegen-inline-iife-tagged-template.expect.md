
## Input

```javascript
import {makeArray, print} from 'shared-runtime';

function log(strings, value) {
  print(value);
  return value;
}

function useTest() {
  return makeArray(
    log`${1}`,
    (function foo() {
      log`${2}`;
      return 2;
    })()
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: useTest,
  params: [],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { makeArray, print } from "shared-runtime";

function log(strings, value) {
  print(value);
  return value;
}

function useTest() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    const t1 = log`${1}`;

    log`${2}`;
    t0 = makeArray(t1, 2);
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useTest,
  params: [],
};

```
      
### Eval output
(kind: ok) [1,2]
logs: [1,2]