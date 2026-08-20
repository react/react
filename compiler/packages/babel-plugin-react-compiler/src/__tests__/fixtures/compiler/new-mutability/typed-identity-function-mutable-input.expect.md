
## Input

```javascript
// @enableNewMutationAliasingModel

import {
  identity,
  makeObject_Primitives,
  typedIdentity,
  useIdentity,
  ValidateMemoization,
} from 'shared-runtime';

function Component({a, b}) {
  // create a mutable value with input `a`
  const x = makeObject_Primitives(a);

  // known to pass-through via aliasing signature
  const x2 = typedIdentity(x);

  // Unknown function so we assume it conditionally mutates,
  // and x is still mutable so
  identity(x2, b);

  return <ValidateMemoization inputs={[a, b]} output={x} />;
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

import {
  identity,
  makeObject_Primitives,
  typedIdentity,
  useIdentity,
  ValidateMemoization,
} from "shared-runtime";

function Component(t0) {
  const $ = _c(9);
  const { a, b } = t0;
  let x;
  if ($[0] !== a || $[1] !== b) {
    x = makeObject_Primitives(a);

    const x2 = typedIdentity(x);

    identity(x2, b);
    $[0] = a;
    $[1] = b;
    $[2] = x;
  } else {
    x = $[2];
  }
  let t1;
  if ($[3] !== a || $[4] !== b) {
    t1 = [a, b];
    $[3] = a;
    $[4] = b;
    $[5] = t1;
  } else {
    t1 = $[5];
  }
  let t2;
  if ($[6] !== t1 || $[7] !== x) {
    t2 = <ValidateMemoization inputs={t1} output={x} />;
    $[6] = t1;
    $[7] = x;
    $[8] = t2;
  } else {
    t2 = $[8];
  }
  return t2;
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
(kind: ok) <div>{"inputs":[0,0],"output":{"a":0,"b":"value1","c":true}}</div>
<div>{"inputs":[1,0],"output":{"a":0,"b":"value1","c":true}}</div>
<div>{"inputs":[1,1],"output":{"a":0,"b":"value1","c":true}}</div>
<div>{"inputs":[0,1],"output":{"a":0,"b":"value1","c":true}}</div>
<div>{"inputs":[0,0],"output":{"a":0,"b":"value1","c":true}}</div>