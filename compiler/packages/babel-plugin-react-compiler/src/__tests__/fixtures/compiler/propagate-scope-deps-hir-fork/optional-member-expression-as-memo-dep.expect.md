
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees @enableOptionalDependencies @enablePropagateDepsInHIR
import {identity, ValidateMemoization} from 'shared-runtime';
import {useMemo} from 'react';

function Component({arg}) {
  const data = useMemo(() => {
    return arg?.items.edges?.nodes.map(identity);
  }, [arg?.items.edges?.nodes]);
  return (
    <ValidateMemoization inputs={[arg?.items.edges?.nodes]} output={data} />
  );
}
export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{arg: null}],
  sequentialRenders: [
    {arg: null},
    {arg: null},
    {arg: {items: {edges: null}}},
    {arg: {items: {edges: null}}},
    {arg: {items: {edges: {nodes: [1, 2, 'hello']}}}},
    {arg: {items: {edges: {nodes: [1, 2, 'hello']}}}},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validatePreserveExistingMemoizationGuarantees @enableOptionalDependencies @enablePropagateDepsInHIR
import { identity, ValidateMemoization } from "shared-runtime";
import { useMemo } from "react";

function Component(t0) {
  const $ = _c(7);
  const { arg } = t0;

  arg?.items.edges?.nodes;
  let t1;
  if ($[0] !== arg?.items.edges?.nodes) {
    t1 = arg?.items.edges?.nodes.map(identity);
    $[0] = arg?.items.edges?.nodes;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const data = t1;

  const t2 = arg?.items.edges?.nodes;
  let t3;
  if ($[2] !== t2) {
    t3 = [t2];
    $[2] = t2;
    $[3] = t3;
  } else {
    t3 = $[3];
  }
  let t4;
  if ($[4] !== data || $[5] !== t3) {
    t4 = <ValidateMemoization inputs={t3} output={data} />;
    $[4] = data;
    $[5] = t3;
    $[6] = t4;
  } else {
    t4 = $[6];
  }
  return t4;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ arg: null }],
  sequentialRenders: [
    { arg: null },
    { arg: null },
    { arg: { items: { edges: null } } },
    { arg: { items: { edges: null } } },
    { arg: { items: { edges: { nodes: [1, 2, "hello"] } } } },
    { arg: { items: { edges: { nodes: [1, 2, "hello"] } } } },
  ],
};

```
      
### Eval output
(kind: ok) <div>{"inputs":[null]}</div>
<div>{"inputs":[null]}</div>
<div>{"inputs":[null]}</div>
<div>{"inputs":[null]}</div>
<div>{"inputs":[[1,2,"hello"]],"output":[1,2,"hello"]}</div>
<div>{"inputs":[[1,2,"hello"]],"output":[1,2,"hello"]}</div>