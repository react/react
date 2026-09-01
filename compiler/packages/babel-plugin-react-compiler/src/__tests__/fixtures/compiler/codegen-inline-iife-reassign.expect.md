
## Input

```javascript
import {makeArray, print} from 'shared-runtime';

function useTest() {
  let w = {};
  return makeArray(
    (w = 42),
    w,
    (function foo() {
      w = 999;
      return 2;
    })(),
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

function useTest() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    let w = {};
    const t1 = (w = 42);
    const t2 = w;

    w = 999;
    t0 = makeArray(t1, t2, 2);
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
(kind: ok) [42,42,2]