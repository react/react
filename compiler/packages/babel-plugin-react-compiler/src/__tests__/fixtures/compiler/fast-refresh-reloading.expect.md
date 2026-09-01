
## Input

```javascript
// @enableResetCacheOnSourceFileChanges
import {useMemo, useState} from 'react';
import {ValidateMemoization} from 'shared-runtime';

function Component(props) {
  const [state, setState] = useState(0);
  const doubled = useMemo(() => [state * 2], [state]);
  return <ValidateMemoization inputs={[state]} output={doubled} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
  sequentialRenders: [{}, {}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enableResetCacheOnSourceFileChanges
import { useMemo, useState } from "react";
import { ValidateMemoization } from "shared-runtime";

function Component(props) {
  const $ = _c(8);
  if (
    $[0] !== "20945b0193e529df490847c66111b38d7b02485d5b53d0829ff3b23af87b105c"
  ) {
    for (let $i = 0; $i < 8; $i += 1) {
      $[$i] = Symbol.for("react.memo_cache_sentinel");
    }
    $[0] = "20945b0193e529df490847c66111b38d7b02485d5b53d0829ff3b23af87b105c";
  }
  const [state] = useState(0);
  const t0 = state * 2;
  let t1;
  if ($[1] !== t0) {
    t1 = [t0];
    $[1] = t0;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  const doubled = t1;
  let t2;
  if ($[3] !== state) {
    t2 = [state];
    $[3] = state;
    $[4] = t2;
  } else {
    t2 = $[4];
  }
  let t3;
  if ($[5] !== doubled || $[6] !== t2) {
    t3 = <ValidateMemoization inputs={t2} output={doubled} />;
    $[5] = doubled;
    $[6] = t2;
    $[7] = t3;
  } else {
    t3 = $[7];
  }
  return t3;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
  sequentialRenders: [{}, {}],
};

```
      
### Eval output
(kind: ok) <div>{"inputs":[0],"output":[0]}</div>
<div>{"inputs":[0],"output":[0]}</div>