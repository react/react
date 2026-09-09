
## Input

```javascript
import {useEffect} from 'react';

let i = 0;
const log = [];

function Component() {
  useEffect(() => {
    const runNumber = i;
    log.push(`effect ${runNumber}`);
    i += 1;
    return () => {
      log.push(`cleanup ${runNumber}`);
    };
  }, []);
  return <div>OK</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useEffect } from "react";

let i = 0;
const log = [];

function Component() {
  const $ = _c(2);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = [];
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  useEffect(_temp, t0);
  let t1;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = <div>OK</div>;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}
function _temp() {
  const runNumber = i;
  log.push(`effect ${runNumber}`);
  i = i + 1;
  return () => {
    log.push(`cleanup ${runNumber}`);
  };
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

### Eval output
(kind: ok) <div>OK</div>
