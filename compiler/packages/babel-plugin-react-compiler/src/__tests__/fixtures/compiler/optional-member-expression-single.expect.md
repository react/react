
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees @enableOptionalDependencies
import {ValidateMemoization} from 'shared-runtime';
import {useMemo} from 'react';
function Component({arg}) {
  const data = useMemo(() => {
    const x = [];
    x.push(arg?.items);
    return x;
  }, [arg?.items]);
  return <ValidateMemoization inputs={[arg?.items]} output={data} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{arg: {items: 2}}],
  sequentialRenders: [
    {arg: {items: 2}},
    {arg: {items: 2}},
    {arg: null},
    {arg: null},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validatePreserveExistingMemoizationGuarantees @enableOptionalDependencies
import { ValidateMemoization } from "shared-runtime";
import { useMemo } from "react";
function Component(t0) {
  const $ = _c(7);
  const { arg } = t0;

  arg?.items;
  let x;
  if ($[0] !== arg?.items) {
    x = [];
    x.push(arg?.items);
    $[0] = arg?.items;
    $[1] = x;
  } else {
    x = $[1];
  }
  const data = x;
  const t1 = arg?.items;
  let t2;
  if ($[2] !== t1) {
    t2 = [t1];
    $[2] = t1;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  let t3;
  if ($[4] !== data || $[5] !== t2) {
    t3 = <ValidateMemoization inputs={t2} output={data} />;
    $[4] = data;
    $[5] = t2;
    $[6] = t3;
  } else {
    t3 = $[6];
  }
  return t3;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ arg: { items: 2 } }],
  sequentialRenders: [
    { arg: { items: 2 } },
    { arg: { items: 2 } },
    { arg: null },
    { arg: null },
  ],
};

```
      
### Eval output
(kind: ok) <div>{"inputs":[2],"output":[2]}</div>
<div>{"inputs":[2],"output":[2]}</div>
<div>{"inputs":[null],"output":[null]}</div>
<div>{"inputs":[null],"output":[null]}</div>