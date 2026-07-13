
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees @validateExhaustiveMemoizationDependencies:false
import {useMemo} from 'react';
import {makeObject_Primitives, ValidateMemoization} from 'shared-runtime';

function Component(props) {
  // Should memoize independently
  const x = useMemo(() => makeObject_Primitives(), []);

  const rest = useMemo(() => {
    const [_, ...rest] = props.array;

    // Should be inferred as Array.proto.push which doesn't mutate input
    rest.push(x);
    return rest;
  });

  return (
    <>
      <ValidateMemoization inputs={[]} output={x} />
      <ValidateMemoization inputs={[props.array]} output={rest} />
    </>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{array: [0, 1, 2]}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validatePreserveExistingMemoizationGuarantees @validateExhaustiveMemoizationDependencies:false
import { useMemo } from "react";
import { makeObject_Primitives, ValidateMemoization } from "shared-runtime";

function Component(props) {
  const $ = _c(9);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = makeObject_Primitives();
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const x = t0;
  let rest;
  if ($[1] !== props.array) {
    [, ...rest] = props.array;

    rest.push(x);
    $[1] = props.array;
    $[2] = rest;
  } else {
    rest = $[2];
  }
  const rest_0 = rest;
  let t1;
  if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = <ValidateMemoization inputs={[]} output={x} />;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  let t2;
  if ($[4] !== props.array) {
    t2 = [props.array];
    $[4] = props.array;
    $[5] = t2;
  } else {
    t2 = $[5];
  }
  let t3;
  if ($[6] !== rest_0 || $[7] !== t2) {
    t3 = (
      <>
        {t1}
        <ValidateMemoization inputs={t2} output={rest_0} />
      </>
    );
    $[6] = rest_0;
    $[7] = t2;
    $[8] = t3;
  } else {
    t3 = $[8];
  }
  return t3;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ array: [0, 1, 2] }],
};

```
      
### Eval output
(kind: ok) <div>{"inputs":[],"output":{"a":0,"b":"value1","c":true}}</div><div>{"inputs":[[0,1,2]],"output":[1,2,{"a":0,"b":"value1","c":true}]}</div>