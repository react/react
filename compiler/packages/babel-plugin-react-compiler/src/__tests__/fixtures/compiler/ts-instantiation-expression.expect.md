
## Input

```javascript
import {identity, invoke} from 'shared-runtime';

function Test() {
  const str = invoke(identity<string>, 'test');
  return str;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Test,
  params: [],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { identity, invoke } from "shared-runtime";

function Test() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = invoke(identity, "test");
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const str = t0;
  return str;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Test,
  params: [],
};

```
      
### Eval output
(kind: ok) "test"