
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees

import {useMemo} from 'react';
import {ValidateMemoization} from 'shared-runtime';

function Component({value}: {value: {label: string}}) {
  const result = useMemo(() => value, [value]);

  return <ValidateMemoization inputs={[value]} output={result} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: {label: 'first'}}],
  sequentialRenders: [{value: {label: 'first'}}, {value: {label: 'second'}}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validatePreserveExistingMemoizationGuarantees

import { useMemo } from "react";
import { ValidateMemoization } from "shared-runtime";

function Component(t0) {
  const $ = _c(5);
  const { value } = t0;
  const result = value;
  let t1;
  if ($[0] !== value) {
    t1 = [value];
    $[0] = value;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  let t2;
  if ($[2] !== result || $[3] !== t1) {
    t2 = <ValidateMemoization inputs={t1} output={result} />;
    $[2] = result;
    $[3] = t1;
    $[4] = t2;
  } else {
    t2 = $[4];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: { label: "first" } }],
  sequentialRenders: [
    { value: { label: "first" } },
    { value: { label: "second" } },
  ],
};

```
      
### Eval output
(kind: ok) <div>{"inputs":[{"label":"first"}],"output":"[[ cyclic ref *2 ]]"}</div>
<div>{"inputs":[{"label":"second"}],"output":"[[ cyclic ref *2 ]]"}</div>