
## Input

```javascript
// @enablePreserveExistingMemoizationGuarantees @validatePreserveExistingMemoizationGuarantees @enableOptionalDependencies

import {useMemo} from 'react';
import {identity, ValidateMemoization} from 'shared-runtime';

function Component({x}) {
  const object = useMemo(() => {
    return identity({
      callback: () => {
        return identity(x.y.z);
      },
    });
  }, [x.y.z]);
  const result = useMemo(() => {
    return [object.callback()];
  }, [object]);
  return <ValidateMemoization inputs={[x.y.z]} output={result} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{x: {y: {z: 42}}}],
  sequentialRenders: [
    {x: {y: {z: 42}}},
    {x: {y: {z: 42}}},
    {x: {y: {z: 3.14}}},
    {x: {y: {z: 42}}},
    {x: {y: {z: 3.14}}},
    {x: {y: {z: 42}}},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enablePreserveExistingMemoizationGuarantees @validatePreserveExistingMemoizationGuarantees @enableOptionalDependencies

import { useMemo } from "react";
import { identity, ValidateMemoization } from "shared-runtime";

function Component(t0) {
  const $ = _c(11);
  const { x } = t0;
  let t1;
  if ($[0] !== x.y.z) {
    t1 = identity({ callback: () => identity(x.y.z) });
    $[0] = x.y.z;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const object = t1;
  let t2;
  if ($[2] !== object) {
    t2 = object.callback();
    $[2] = object;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  let t3;
  if ($[4] !== t2) {
    t3 = [t2];
    $[4] = t2;
    $[5] = t3;
  } else {
    t3 = $[5];
  }
  const result = t3;
  let t4;
  if ($[6] !== x.y.z) {
    t4 = [x.y.z];
    $[6] = x.y.z;
    $[7] = t4;
  } else {
    t4 = $[7];
  }
  let t5;
  if ($[8] !== result || $[9] !== t4) {
    t5 = <ValidateMemoization inputs={t4} output={result} />;
    $[8] = result;
    $[9] = t4;
    $[10] = t5;
  } else {
    t5 = $[10];
  }
  return t5;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ x: { y: { z: 42 } } }],
  sequentialRenders: [
    { x: { y: { z: 42 } } },
    { x: { y: { z: 42 } } },
    { x: { y: { z: 3.14 } } },
    { x: { y: { z: 42 } } },
    { x: { y: { z: 3.14 } } },
    { x: { y: { z: 42 } } },
  ],
};

```
      
### Eval output
(kind: ok) <div>{"inputs":[42],"output":[42]}</div>
<div>{"inputs":[42],"output":[42]}</div>
<div>{"inputs":[3.14],"output":[3.14]}</div>
<div>{"inputs":[42],"output":[42]}</div>
<div>{"inputs":[3.14],"output":[3.14]}</div>
<div>{"inputs":[42],"output":[42]}</div>