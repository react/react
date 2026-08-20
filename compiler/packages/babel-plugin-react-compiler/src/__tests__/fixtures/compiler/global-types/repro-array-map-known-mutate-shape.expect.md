
## Input

```javascript
import {Stringify, useIdentity} from 'shared-runtime';

/**
 * Also see repro-array-map-known-nonmutate-Boolean, which calls a global
 * function that does *not* mutate its operands.
 */
function Component({value}) {
  const arr = [
    new Set([['foo', 2]]).values(),
    new Set([['bar', 4]]).values(),
    [['baz', value]],
  ];
  useIdentity(null);
  const derived = arr.map(Object.fromEntries);
  return (
    <Stringify>
      {derived.at(0)}
      {derived.at(-1)}
    </Stringify>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 5}],
  sequentialRenders: [{value: 5}, {value: 6}, {value: 6}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify, useIdentity } from "shared-runtime";

/**
 * Also see repro-array-map-known-nonmutate-Boolean, which calls a global
 * function that does *not* mutate its operands.
 */
function Component(t0) {
  const $ = _c(7);
  const { value } = t0;
  const arr = [
    new Set([["foo", 2]]).values(),
    new Set([["bar", 4]]).values(),
    [["baz", value]],
  ];

  useIdentity(null);
  const derived = arr.map(Object.fromEntries);
  let t1;
  if ($[0] !== derived) {
    t1 = derived.at(0);
    $[0] = derived;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  let t2;
  if ($[2] !== derived) {
    t2 = derived.at(-1);
    $[2] = derived;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  let t3;
  if ($[4] !== t1 || $[5] !== t2) {
    t3 = (
      <Stringify>
        {t1}
        {t2}
      </Stringify>
    );
    $[4] = t1;
    $[5] = t2;
    $[6] = t3;
  } else {
    t3 = $[6];
  }
  return t3;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: 5 }],
  sequentialRenders: [{ value: 5 }, { value: 6 }, { value: 6 }],
};

```
      
### Eval output
(kind: ok) <div>{"children":[{"foo":2},{"baz":5}]}</div>
<div>{"children":[{"foo":2},{"baz":6}]}</div>
<div>{"children":[{"foo":2},{"baz":6}]}</div>