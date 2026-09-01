
## Input

```javascript
// @compilationMode:"infer" @enableResetCacheOnSourceFileChanges @validateExhaustiveMemoizationDependencies:false
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

  // TODO: In fast refresh mode (@enableResetCacheOnSourceFileChanges) Forget should
  // reset on changes to globals that impact the component/hook, effectively memoizing
  // as if value was reactive. However, we don't want to actually treat globals as
  // reactive (though that would be trivial) since it could change compilation too much
  // btw dev and prod. Instead, we should reset the cache via a secondary mechanism.
  const value = useMemo(() => [{pretendConst}], [pretendConst]);

  return <ValidateMemoization inputs={[pretendConst]} output={value} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
  sequentialRenders: [{}, {}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @compilationMode:"infer" @enableResetCacheOnSourceFileChanges @validateExhaustiveMemoizationDependencies:false
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
  const $ = _c(3);
  if (
    $[0] !== "36c02976ff5bc474b7510128ea8220ffe31d92cd5d245148ed0a43146d18ded4"
  ) {
    for (let $i = 0; $i < 3; $i += 1) {
      $[$i] = Symbol.for("react.memo_cache_sentinel");
    }
    $[0] = "36c02976ff5bc474b7510128ea8220ffe31d92cd5d245148ed0a43146d18ded4";
  }
  useState(_temp);

  unsafeUpdateConst();
  let t0;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = [{ pretendConst }];
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const value = t0;
  let t1;
  if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = <ValidateMemoization inputs={[pretendConst]} output={value} />;
    $[2] = t1;
  } else {
    t1 = $[2];
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
      