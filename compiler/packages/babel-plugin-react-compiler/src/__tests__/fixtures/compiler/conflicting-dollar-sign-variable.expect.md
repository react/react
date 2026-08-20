
## Input

```javascript
import {identity} from 'shared-runtime';

function Component(props) {
  const $ = identity('jQuery');
  const t0 = identity([$]);
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { identity } from "shared-runtime";

function Component(props) {
  const $0 = _c(1);
  let t0;
  if ($0[0] === Symbol.for("react.memo_cache_sentinel")) {
    const $ = identity("jQuery");
    t0 = identity([$]);
    $0[0] = t0;
  } else {
    t0 = $0[0];
  }
  const t0$0 = t0;
  return t0$0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) ["jQuery"]