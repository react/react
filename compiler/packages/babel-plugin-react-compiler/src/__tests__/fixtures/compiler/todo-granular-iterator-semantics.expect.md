
## Input

```javascript
import {useIdentity, ValidateMemoization} from 'shared-runtime';

/**
 * Fixture for granular iterator semantics:
 * 1. ConditionallyMutate the iterator itself, depending on whether the iterator
 *    is a mutable iterator.
 * 2. Capture effect on elements within the iterator.
 */
function Validate({x, input}) {
  'use no memo';
  return (
    <>
      <ValidateMemoization inputs={[]} output={x[0]} onlyCheckCompiled={true} />
      <ValidateMemoization
        inputs={[input]}
        output={x[1]}
        onlyCheckCompiled={true}
      />
    </>
  );
}
function useFoo(input) {
  'use memo';
  /**
   * We should be able to memoize {} separately from `x`.
   */
  const x = Array.from([{}]);
  useIdentity();
  x.push([input]);
  return <Validate x={x} input={input} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [1],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useIdentity, ValidateMemoization } from "shared-runtime";

/**
 * Fixture for granular iterator semantics:
 * 1. ConditionallyMutate the iterator itself, depending on whether the iterator
 *    is a mutable iterator.
 * 2. Capture effect on elements within the iterator.
 */
function Validate({ x, input }) {
  "use no memo";
  return (
    <>
      <ValidateMemoization inputs={[]} output={x[0]} onlyCheckCompiled={true} />
      <ValidateMemoization
        inputs={[input]}
        output={x[1]}
        onlyCheckCompiled={true}
      />
    </>
  );
}
function useFoo(input) {
  "use memo";
  const $ = _c(6);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = [{}];
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const x = Array.from(t0);
  useIdentity();
  let t1;
  if ($[1] !== input) {
    t1 = [input];
    $[1] = input;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  x.push(t1);
  let t2;
  if ($[3] !== input || $[4] !== x) {
    t2 = <Validate x={x} input={input} />;
    $[3] = input;
    $[4] = x;
    $[5] = t2;
  } else {
    t2 = $[5];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [1],
};

```
      
### Eval output
(kind: ok) <div>{"inputs":[],"output":{}}</div><div>{"inputs":[1],"output":[1]}</div>