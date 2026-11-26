
## Input

```javascript
import invariant from 'invariant';
import {useState} from 'react';
import {makeObject_Primitives, mutate} from 'shared-runtime';

const USE_STATE = false;

/**
 * Like repro-invalid-pruned-scope-leaks-value, but `f` has the type of a state
 * setter, because the ternary takes the type of its first branch. `f` is the
 * closure, which is recreated on every render, so `thing` must depend on it.
 */
function MyApp({count}) {
  const z = makeObject_Primitives();
  const [, setState] = useState(0);
  const f = USE_STATE
    ? setState
    : v => {
        z.v = v;
      };
  mutate(z);
  const thing = [count, f];
  if (thing[1] !== f) {
    invariant(false, 'oh no!');
  }
  return thing;
}

export const FIXTURE_ENTRYPOINT = {
  fn: MyApp,
  params: [{count: 2}],
  sequentialRenders: [{count: 2}, {count: 2}, {count: 3}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import invariant from "invariant";
import { useState } from "react";
import { makeObject_Primitives, mutate } from "shared-runtime";

const USE_STATE = false;

/**
 * Like repro-invalid-pruned-scope-leaks-value, but `f` has the type of a state
 * setter, because the ternary takes the type of its first branch. `f` is the
 * closure, which is recreated on every render, so `thing` must depend on it.
 */
function MyApp(t0) {
  const $ = _c(3);
  const { count } = t0;
  const z = makeObject_Primitives();
  const [, setState] = useState(0);
  const f = USE_STATE
    ? setState
    : (v) => {
        z.v = v;
      };

  mutate(z);
  let t1;
  if ($[0] !== count || $[1] !== f) {
    t1 = [count, f];
    $[0] = count;
    $[1] = f;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  const thing = t1;
  if (thing[1] !== f) {
    invariant(false, "oh no!");
  }

  return thing;
}

export const FIXTURE_ENTRYPOINT = {
  fn: MyApp,
  params: [{ count: 2 }],
  sequentialRenders: [{ count: 2 }, { count: 2 }, { count: 3 }],
};

```
      
### Eval output
(kind: ok) [2,"[[ function params=1 ]]"]
[2,"[[ function params=1 ]]"]
[3,"[[ function params=1 ]]"]