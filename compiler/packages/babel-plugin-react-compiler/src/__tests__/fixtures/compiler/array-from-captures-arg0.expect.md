
## Input

```javascript
import {useIdentity, Stringify} from 'shared-runtime';

/**
 * TODO: Note that this `Array.from` is inferred to be mutating its first
 * argument. This is because React Compiler's typing system does not yet support
 * annotating a function with a set of argument match cases + distinct
 * definitions (polymorphism)
 *
 * In this case, we should be able to infer that the `Array.from` call is
 * not mutating its 0th argument.
 * The 0th argument should be typed as having `effect:Mutate` only when
 * (1) it might be a mutable iterable or
 * (2) the 1st argument might mutate its callee
 */
function Component({value}) {
  const arr = [{value: 'foo'}, {value: 'bar'}, {value}];
  useIdentity();
  const derived = Array.from(arr);
  return <Stringify>{derived.at(-1)}</Stringify>;
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
import { useIdentity, Stringify } from "shared-runtime";

/**
 * TODO: Note that this `Array.from` is inferred to be mutating its first
 * argument. This is because React Compiler's typing system does not yet support
 * annotating a function with a set of argument match cases + distinct
 * definitions (polymorphism)
 *
 * In this case, we should be able to infer that the `Array.from` call is
 * not mutating its 0th argument.
 * The 0th argument should be typed as having `effect:Mutate` only when
 * (1) it might be a mutable iterable or
 * (2) the 1st argument might mutate its callee
 */
function Component(t0) {
  const $ = _c(10);
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
  useIdentity();
  let t4;
  if ($[4] !== arr) {
    t4 = Array.from(arr);
    $[4] = arr;
    $[5] = t4;
  } else {
    t4 = $[5];
  }
  const derived = t4;
  let t5;
  if ($[6] !== derived) {
    t5 = derived.at(-1);
    $[6] = derived;
    $[7] = t5;
  } else {
    t5 = $[7];
  }
  let t6;
  if ($[8] !== t5) {
    t6 = <Stringify>{t5}</Stringify>;
    $[8] = t5;
    $[9] = t6;
  } else {
    t6 = $[9];
  }
  return t6;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: 5 }],
  sequentialRenders: [{ value: 5 }, { value: 6 }, { value: 6 }],
};

```
      
### Eval output
(kind: ok) <div>{"children":{"value":5}}</div>
<div>{"children":{"value":6}}</div>
<div>{"children":{"value":6}}</div>