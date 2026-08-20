
## Input

```javascript
import {Stringify, useIdentity} from 'shared-runtime';

/**
 * Also see repro-array-map-known-mutate-shape, which calls a global function
 * that mutates its operands.
 */
function Component({value}) {
  const arr = [{value: 'foo'}, {value: 'bar'}, {value}];
  useIdentity(null);
  const derived = arr.filter(Boolean);
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
 * Also see repro-array-map-known-mutate-shape, which calls a global function
 * that mutates its operands.
 */
function Component(t0) {
  const $ = _c(13);
  const { value } = t0;
  let t1;
  let t2;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = { value: "foo" };
    t2 = { value: "bar" };
    $[0] = t1;
    $[1] = t2;
  } else {
    t1 = $[0];
    t2 = $[1];
  }
  let t3;
  if ($[2] !== value) {
    t3 = [t1, t2, { value }];
    $[2] = value;
    $[3] = t3;
  } else {
    t3 = $[3];
  }
  const arr = t3;
  useIdentity(null);
  let t4;
  if ($[4] !== arr) {
    t4 = arr.filter(Boolean);
    $[4] = arr;
    $[5] = t4;
  } else {
    t4 = $[5];
  }
  const derived = t4;
  let t5;
  if ($[6] !== derived) {
    t5 = derived.at(0);
    $[6] = derived;
    $[7] = t5;
  } else {
    t5 = $[7];
  }
  let t6;
  if ($[8] !== derived) {
    t6 = derived.at(-1);
    $[8] = derived;
    $[9] = t6;
  } else {
    t6 = $[9];
  }
  let t7;
  if ($[10] !== t5 || $[11] !== t6) {
    t7 = (
      <Stringify>
        {t5}
        {t6}
      </Stringify>
    );
    $[10] = t5;
    $[11] = t6;
    $[12] = t7;
  } else {
    t7 = $[12];
  }
  return t7;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: 5 }],
  sequentialRenders: [{ value: 5 }, { value: 6 }, { value: 6 }],
};

```
      
### Eval output
(kind: ok) <div>{"children":[{"value":"foo"},{"value":5}]}</div>
<div>{"children":[{"value":"foo"},{"value":6}]}</div>
<div>{"children":[{"value":"foo"},{"value":6}]}</div>