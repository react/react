
## Input

```javascript
import {getNumber} from 'shared-runtime';

function useFoo() {
  try {
    return getNumber();
  } catch {}
}
export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { getNumber } from "shared-runtime";

function useFoo() {
  const $ = _c(1);
  try {
    let t0;
    if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
      t0 = getNumber();
      $[0] = t0;
    } else {
      t0 = $[0];
    }
    return t0;
  } catch {}
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
};

```
      
### Eval output
(kind: ok) 4