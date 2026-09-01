
## Input

```javascript
import {useMemo} from 'react';
import {
  makeObject_Primitives,
  mutate,
  Stringify,
  ValidateMemoization,
} from 'shared-runtime';

function Component({cond}) {
  const memoized = useMemo(() => {
    const value = makeObject_Primitives();
    if (cond) {
      return value;
    } else {
      mutate(value);
      return value;
    }
  }, [cond]);
  return <ValidateMemoization inputs={[cond]} output={memoized} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{cond: false}],
  sequentialRenders: [
    {cond: false},
    {cond: false},
    {cond: true},
    {cond: true},
    {cond: false},
    {cond: true},
    {cond: false},
    {cond: true},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useMemo } from "react";
import {
  makeObject_Primitives,
  mutate,
  Stringify,
  ValidateMemoization,
} from "shared-runtime";

function Component(t0) {
  const $ = _c(7);
  const { cond } = t0;
  let t1;
  if ($[0] !== cond) {
    const value = makeObject_Primitives();
    if (cond) {
      t1 = value;
    } else {
      mutate(value);
      t1 = value;
    }
    $[0] = cond;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const memoized = t1;
  let t2;
  if ($[2] !== cond) {
    t2 = [cond];
    $[2] = cond;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  let t3;
  if ($[4] !== memoized || $[5] !== t2) {
    t3 = <ValidateMemoization inputs={t2} output={memoized} />;
    $[4] = memoized;
    $[5] = t2;
    $[6] = t3;
  } else {
    t3 = $[6];
  }
  return t3;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ cond: false }],
  sequentialRenders: [
    { cond: false },
    { cond: false },
    { cond: true },
    { cond: true },
    { cond: false },
    { cond: true },
    { cond: false },
    { cond: true },
  ],
};

```
      
### Eval output
(kind: ok) <div>{"inputs":[false],"output":{"a":0,"b":"value1","c":true,"wat0":"joe"}}</div>
<div>{"inputs":[false],"output":{"a":0,"b":"value1","c":true,"wat0":"joe"}}</div>
<div>{"inputs":[true],"output":{"a":0,"b":"value1","c":true}}</div>
<div>{"inputs":[true],"output":{"a":0,"b":"value1","c":true}}</div>
<div>{"inputs":[false],"output":{"a":0,"b":"value1","c":true,"wat0":"joe"}}</div>
<div>{"inputs":[true],"output":{"a":0,"b":"value1","c":true}}</div>
<div>{"inputs":[false],"output":{"a":0,"b":"value1","c":true,"wat0":"joe"}}</div>
<div>{"inputs":[true],"output":{"a":0,"b":"value1","c":true}}</div>