
## Input

```javascript
function Component() {
  const parameter = function self(self) {
    return self + 1;
  };
  const local = function self() {
    {
      const self = 2;
      return self;
    }
  };
  const nested = function self() {
    return function inner(self) {
      return self + 3;
    };
  };
  const unused = function self() {
    return 4;
  };
  return [parameter(1), local(), nested()(1), unused()];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component() {
  const $ = _c(6);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = function self(self) {
      return self + 1;
    };
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const parameter = t0;
  let t1;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = function self() {
      return 2;
    };
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const local = t1;
  let t2;
  if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = function self() {
      return function inner(self_1) {
        return self_1 + 3;
      };
    };
    $[2] = t2;
  } else {
    t2 = $[2];
  }
  const nested = t2;
  let t3;
  if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
    t3 = function self() {
      return 4;
    };
    $[3] = t3;
  } else {
    t3 = $[3];
  }
  const unused = t3;

  const t4 = parameter(1);
  const t5 = local();
  let t6;
  if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
    t6 = nested()(1);
    $[4] = t6;
  } else {
    t6 = $[4];
  }
  let t7;
  if ($[5] === Symbol.for("react.memo_cache_sentinel")) {
    t7 = [t4, t5, t6, unused()];
    $[5] = t7;
  } else {
    t7 = $[5];
  }
  return t7;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```
      
### Eval output
(kind: ok) [2,2,4,4]