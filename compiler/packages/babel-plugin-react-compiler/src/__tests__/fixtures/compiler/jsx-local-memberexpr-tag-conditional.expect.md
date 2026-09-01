
## Input

```javascript
import * as SharedRuntime from 'shared-runtime';
function useFoo({cond}) {
  const MyLocal = SharedRuntime;
  if (cond) {
    return <MyLocal.Text value={4} />;
  } else {
    return null;
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{cond: true}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import * as SharedRuntime from "shared-runtime";
function useFoo(t0) {
  const $ = _c(1);
  const { cond } = t0;

  if (cond) {
    let t1;
    if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
      t1 = <SharedRuntime.Text value={4} />;
      $[0] = t1;
    } else {
      t1 = $[0];
    }
    return t1;
  } else {
    return null;
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{ cond: true }],
};

```
      
### Eval output
(kind: ok) <div>4</div>