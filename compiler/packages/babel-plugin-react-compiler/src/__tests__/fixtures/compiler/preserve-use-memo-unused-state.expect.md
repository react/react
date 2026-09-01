
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees
import {useCallback, useTransition} from 'react';

function useFoo() {
  const [, /* state value intentionally not captured */ setState] = useState();

  return useCallback(() => {
    setState(x => x + 1);
  }, []);
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validatePreserveExistingMemoizationGuarantees
import { useCallback, useTransition } from "react";

function useFoo() {
  const $ = _c(1);
  const [, setState] = useState();
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = () => {
      setState(_temp);
    };
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}
function _temp(x) {
  return x + 1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
};

```
      
### Eval output
(kind: exception) useState is not defined