
## Input

```javascript
// @enableAssumeHooksFollowRulesOfReact @enableTransitivelyFreezeFunctionExpressions
import {useMemo, useState} from 'react';
import {ValidateMemoization, identity} from 'shared-runtime';

function Component({value}) {
  const result = useMemo(() => {
    if (value == null) {
      return null;
    }
    try {
      return {value};
    } catch (e) {
      return null;
    }
  }, [value]);
  return <ValidateMemoization inputs={[value]} output={result} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: null}],
  sequentialRenders: [
    {value: null},
    {value: null},
    {value: 42},
    {value: 42},
    {value: null},
    {value: 42},
    {value: null},
    {value: 42},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enableAssumeHooksFollowRulesOfReact @enableTransitivelyFreezeFunctionExpressions
import { useMemo, useState } from "react";
import { ValidateMemoization, identity } from "shared-runtime";

function Component(t0) {
  const $ = _c(7);
  const { value } = t0;
  let t1;
  bb0: {
    if (value == null) {
      t1 = null;
      break bb0;
    }

    try {
      let t3;
      if ($[0] !== value) {
        t3 = { value };
        $[0] = value;
        $[1] = t3;
      } else {
        t3 = $[1];
      }
      t1 = t3;
    } catch (t2) {
      t1 = null;
    }
  }
  const result = t1;
  let t2;
  if ($[2] !== value) {
    t2 = [value];
    $[2] = value;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  let t3;
  if ($[4] !== result || $[5] !== t2) {
    t3 = <ValidateMemoization inputs={t2} output={result} />;
    $[4] = result;
    $[5] = t2;
    $[6] = t3;
  } else {
    t3 = $[6];
  }
  return t3;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: null }],
  sequentialRenders: [
    { value: null },
    { value: null },
    { value: 42 },
    { value: 42 },
    { value: null },
    { value: 42 },
    { value: null },
    { value: 42 },
  ],
};

```
      
### Eval output
(kind: ok) <div>{"inputs":[null],"output":"[[ cyclic ref *2 ]]"}</div>
<div>{"inputs":[null],"output":"[[ cyclic ref *2 ]]"}</div>
<div>{"inputs":[42],"output":{"value":42}}</div>
<div>{"inputs":[42],"output":{"value":42}}</div>
<div>{"inputs":[null],"output":"[[ cyclic ref *2 ]]"}</div>
<div>{"inputs":[42],"output":{"value":42}}</div>
<div>{"inputs":[null],"output":"[[ cyclic ref *2 ]]"}</div>
<div>{"inputs":[42],"output":{"value":42}}</div>