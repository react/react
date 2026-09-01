
## Input

```javascript
// @enableNewMutationAliasingModel

import {useMemo} from 'react';
import {
  identity,
  makeObject_Primitives,
  typedIdentity,
  useIdentity,
  ValidateMemoization,
} from 'shared-runtime';

function Component({a, b}) {
  // create a mutable value with input `a`
  const x = useMemo(() => makeObject_Primitives(a), [a]);

  // freeze the value
  useIdentity(x);

  // known to pass-through via aliasing signature
  const x2 = typedIdentity(x);

  // Unknown function so we assume it conditionally mutates,
  // but x2 is frozen so this downgrades to a read.
  // x should *not* take b as a dependency
  identity(x2, b);

  return <ValidateMemoization inputs={[a]} output={x} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 0, b: 0}],
  sequentialRenders: [
    {a: 0, b: 0},
    {a: 1, b: 0},
    {a: 1, b: 1},
    {a: 0, b: 1},
    {a: 0, b: 0},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enableNewMutationAliasingModel

import { useMemo } from "react";
import {
  identity,
  makeObject_Primitives,
  typedIdentity,
  useIdentity,
  ValidateMemoization,
} from "shared-runtime";

function Component(t0) {
  const $ = _c(7);
  const { a, b } = t0;
  let t1;
  if ($[0] !== a) {
    t1 = makeObject_Primitives(a);
    $[0] = a;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const x = t1;

  useIdentity(x);

  const x2 = typedIdentity(x);

  identity(x2, b);
  let t2;
  if ($[2] !== a) {
    t2 = [a];
    $[2] = a;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  let t3;
  if ($[4] !== t2 || $[5] !== x) {
    t3 = <ValidateMemoization inputs={t2} output={x} />;
    $[4] = t2;
    $[5] = x;
    $[6] = t3;
  } else {
    t3 = $[6];
  }
  return t3;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ a: 0, b: 0 }],
  sequentialRenders: [
    { a: 0, b: 0 },
    { a: 1, b: 0 },
    { a: 1, b: 1 },
    { a: 0, b: 1 },
    { a: 0, b: 0 },
  ],
};

```
      
### Eval output
(kind: ok) <div>{"inputs":[0],"output":{"a":0,"b":"value1","c":true}}</div>
<div>{"inputs":[1],"output":{"a":0,"b":"value1","c":true}}</div>
<div>{"inputs":[1],"output":{"a":0,"b":"value1","c":true}}</div>
<div>{"inputs":[0],"output":{"a":0,"b":"value1","c":true}}</div>
<div>{"inputs":[0],"output":{"a":0,"b":"value1","c":true}}</div>