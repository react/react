
## Input

```javascript
import {useEffect} from 'react';

function someGlobal() {}
function useFoo() {
  const fn = React.useMemo(
    () =>
      function () {
        someGlobal();
      },
    []
  );
  useEffect(() => {
    fn();
  }, [fn]);

  return null;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
  isComponent: false,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useEffect } from "react";

function someGlobal() {}
function useFoo() {
  const $ = _c(2);
  const fn = _temp;
  let t0;
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = () => {
      fn();
    };
    t1 = [fn];
    $[0] = t0;
    $[1] = t1;
  } else {
    t0 = $[0];
    t1 = $[1];
  }
  useEffect(t0, t1);

  return null;
}
function _temp() {
  someGlobal();
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) null