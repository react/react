
## Input

```javascript
// @compilationMode:"infer" @enablePreserveExistingMemoizationGuarantees @validatePreserveExistingMemoizationGuarantees
import {useMemo} from 'react';
import {makeObject_Primitives, ValidateMemoization} from 'shared-runtime';

function Component(props) {
  const result = useMemo(() => {
    return makeObject(props.value).value + 1;
  }, [props.value]);
  return <ValidateMemoization inputs={[props.value]} output={result} />;
}

function makeObject(value) {
  console.log(value);
  return {value};
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 42}],
  sequentialRenders: [
    {value: 42},
    {value: 42},
    {value: 3.14},
    {value: 3.14},
    {value: 42},
    {value: 3.14},
    {value: 42},
    {value: 3.14},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @compilationMode:"infer" @enablePreserveExistingMemoizationGuarantees @validatePreserveExistingMemoizationGuarantees
import { useMemo } from "react";
import { makeObject_Primitives, ValidateMemoization } from "shared-runtime";

function Component(props) {
  const $ = _c(7);
  let t0;
  if ($[0] !== props.value) {
    t0 = makeObject(props.value);
    $[0] = props.value;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const result = t0.value + 1;
  let t1;
  if ($[2] !== props.value) {
    t1 = [props.value];
    $[2] = props.value;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  let t2;
  if ($[4] !== result || $[5] !== t1) {
    t2 = <ValidateMemoization inputs={t1} output={result} />;
    $[4] = result;
    $[5] = t1;
    $[6] = t2;
  } else {
    t2 = $[6];
  }
  return t2;
}

function makeObject(value) {
  console.log(value);
  return { value };
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: 42 }],
  sequentialRenders: [
    { value: 42 },
    { value: 42 },
    { value: 3.14 },
    { value: 3.14 },
    { value: 42 },
    { value: 3.14 },
    { value: 42 },
    { value: 3.14 },
  ],
};

```
      
### Eval output
(kind: ok) <div>{"inputs":[42],"output":43}</div>
<div>{"inputs":[42],"output":43}</div>
<div>{"inputs":[3.14],"output":4.140000000000001}</div>
<div>{"inputs":[3.14],"output":4.140000000000001}</div>
<div>{"inputs":[42],"output":43}</div>
<div>{"inputs":[3.14],"output":4.140000000000001}</div>
<div>{"inputs":[42],"output":43}</div>
<div>{"inputs":[3.14],"output":4.140000000000001}</div>
logs: [42,3.14,42,3.14,42,3.14]