
## Input

```javascript
import {Stringify} from 'shared-runtime';

function hoisting() {
  function onClick(x) {
    return x + bar.baz;
  }
  const bar = {baz: 1};

  return <Stringify onClick={onClick} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: hoisting,
  params: [],
  isComponent: false,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify } from "shared-runtime";

function hoisting() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    const onClick = function onClick(x) {
      return x + bar.baz;
    };
    const bar = { baz: 1 };
    t0 = <Stringify onClick={onClick} />;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: hoisting,
  params: [],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) <div>{"onClick":"[[ function params=1 ]]"}</div>