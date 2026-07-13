
## Input

```javascript
// @enablePreserveExistingMemoizationGuarantees @validatePreserveExistingMemoizationGuarantees @enableOptionalDependencies

import {useMemo} from 'react';
import {identity, ValidateMemoization} from 'shared-runtime';

function Component({x, y, z}) {
  const object = useMemo(() => {
    return identity({
      callback: () => {
        return identity(x?.y?.z, y.a?.b, z.a.b?.c);
      },
    });
  }, [x?.y?.z, y.a?.b, z.a.b?.c]);
  const result = useMemo(() => {
    return [object.callback()];
  }, [object]);
  return <Inner x={x} result={result} />;
}

function Inner({x, result}) {
  'use no memo';
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
  const { x, y, z } = t0;

  x?.y?.z;
  y.a?.b;
  z.a.b?.c;
  let t1;
  if ($[0] !== x?.y?.z || $[1] !== y.a?.b || $[2] !== z.a.b?.c) {
    t1 = identity({ callback: () => identity(x?.y?.z, y.a?.b, z.a.b?.c) });
    $[0] = x?.y?.z;
    $[1] = y.a?.b;
    $[2] = z.a.b?.c;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  const object = t1;
  let t2;
  if ($[4] !== object) {
    t2 = object.callback();
    $[4] = object;
    $[5] = t2;
  } else {
    t2 = $[5];
  }
  let t3;
  if ($[6] !== t2) {
    t3 = [t2];
    $[6] = t2;
    $[7] = t3;
  } else {
    t3 = $[7];
  }
  const result = t3;
  let t4;
  if ($[8] !== result || $[9] !== x) {
    t4 = <Inner x={x} result={result} />;
    $[8] = result;
    $[9] = x;
    $[10] = t4;
  } else {
    t4 = $[10];
  }
  return t4;
}

function Inner({ x, result }) {
  "use no memo";
  return <ValidateMemoization inputs={[x.y.z]} output={result} />;
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
(kind: ok) [[ (exception in render) TypeError: Cannot read properties of undefined (reading 'a') ]]
[[ (exception in render) TypeError: Cannot read properties of undefined (reading 'a') ]]
[[ (exception in render) TypeError: Cannot read properties of undefined (reading 'a') ]]
[[ (exception in render) TypeError: Cannot read properties of undefined (reading 'a') ]]
[[ (exception in render) TypeError: Cannot read properties of undefined (reading 'a') ]]
[[ (exception in render) TypeError: Cannot read properties of undefined (reading 'a') ]]