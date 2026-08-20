
## Input

```javascript
import {Stringify} from 'shared-runtime';
function useFoo() {
  const MyLocal = Stringify;
  const callback = () => {
    return <MyLocal value={4} />;
  };
  return callback();
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify } from "shared-runtime";
function useFoo() {
  const $ = _c(1);

  const callback = _temp;
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = callback();
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}
function _temp() {
  return <Stringify value={4} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
};

```
      
### Eval output
(kind: ok) <div>{"value":4}</div>