
## Input

```javascript
import * as SharedRuntime from 'shared-runtime';
function useFoo() {
  const MyLocal = SharedRuntime;
  return <MyLocal.Text value={4} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import * as SharedRuntime from "shared-runtime";
function useFoo() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = <SharedRuntime.Text value={4} />;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
};

```
      
### Eval output
(kind: ok) <div>4</div>