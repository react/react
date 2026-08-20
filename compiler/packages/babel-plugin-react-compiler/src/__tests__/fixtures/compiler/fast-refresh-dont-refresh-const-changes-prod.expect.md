
## Input

```javascript
// @compilationMode:"infer"
import {useEffect, useMemo, useState} from 'react';
import {ValidateMemoization} from 'shared-runtime';

let pretendConst = 0;

function unsafeResetConst() {
  pretendConst = 0;
}

function unsafeUpdateConst() {
  pretendConst += 1;
}

function Component() {
  useState(() => {
    // unsafe: reset the constant when first rendering the instance
    unsafeResetConst();
  });
  // UNSAFE! changing a module variable that is read by a component is normally
  // unsafe, but in this case we're simulating a fast refresh between each render
  unsafeUpdateConst();

  // In production mode (no @enableResetCacheOnSourceFileChanges) memo caches are not
  // reset unless the deps change
  const value = useMemo(() => [{pretendConst}], []);

  return <ValidateMemoization inputs={[]} output={value} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
  sequentialRenders: [{}, {}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @compilationMode:"infer"
import { useEffect, useMemo, useState } from "react";
import { ValidateMemoization } from "shared-runtime";

let pretendConst = 0;

function unsafeResetConst() {
  pretendConst = 0;
}

function unsafeUpdateConst() {
  pretendConst += 1;
}

function Component() {
  const $ = _c(2);
  useState(_temp);

  unsafeUpdateConst();
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = [{ pretendConst }];
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const value = t0;
  let t1;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = <ValidateMemoization inputs={[]} output={value} />;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}
function _temp() {
  unsafeResetConst();
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
  sequentialRenders: [{}, {}],
};

```
      
### Eval output
(kind: ok) <div>{"inputs":[],"output":[{"pretendConst":1}]}</div>
<div>{"inputs":[],"output":[{"pretendConst":1}]}</div>