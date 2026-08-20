
## Input

```javascript
import {useIdentity, ValidateMemoization} from 'shared-runtime';

/**
 * Fixture to assert that we can infer the type and effects of an array created
 * with `Array.from`.
 */
function Validate({x, val1, val2}) {
  'use no memo';
  return (
    <>
      <ValidateMemoization
        inputs={[val1]}
        output={x[0]}
        onlyCheckCompiled={true}
      />
      <ValidateMemoization
        inputs={[val2]}
        output={x[1]}
        onlyCheckCompiled={true}
      />
    </>
  );
}
function useFoo({val1, val2}) {
  'use memo';
  const x = Array.from([]);
  useIdentity();
  x.push([val1]);
  x.push([val2]);
  return <Validate x={x} val1={val1} val2={val2} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{val1: 1, val2: 2}],
  params: [
    {val1: 1, val2: 2},
    {val1: 1, val2: 2},
    {val1: 1, val2: 3},
    {val1: 4, val2: 2},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useIdentity, ValidateMemoization } from "shared-runtime";

/**
 * Fixture to assert that we can infer the type and effects of an array created
 * with `Array.from`.
 */
function Validate({ x, val1, val2 }) {
  "use no memo";
  return (
    <>
      <ValidateMemoization
        inputs={[val1]}
        output={x[0]}
        onlyCheckCompiled={true}
      />

      <ValidateMemoization
        inputs={[val2]}
        output={x[1]}
        onlyCheckCompiled={true}
      />
    </>
  );
}
function useFoo(t0) {
  "use memo";
  const $ = _c(9);
  const { val1, val2 } = t0;
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = [];
    $[0] = t1;
  } else {
    t1 = $[0];
  }
  const x = Array.from(t1);
  useIdentity();
  let t2;
  if ($[1] !== val1) {
    t2 = [val1];
    $[1] = val1;
    $[2] = t2;
  } else {
    t2 = $[2];
  }
  x.push(t2);
  let t3;
  if ($[3] !== val2) {
    t3 = [val2];
    $[3] = val2;
    $[4] = t3;
  } else {
    t3 = $[4];
  }
  x.push(t3);
  let t4;
  if ($[5] !== val1 || $[6] !== val2 || $[7] !== x) {
    t4 = <Validate x={x} val1={val1} val2={val2} />;
    $[5] = val1;
    $[6] = val2;
    $[7] = x;
    $[8] = t4;
  } else {
    t4 = $[8];
  }
  return t4;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{ val1: 1, val2: 2 }],
  params: [
    { val1: 1, val2: 2 },
    { val1: 1, val2: 2 },
    { val1: 1, val2: 3 },
    { val1: 4, val2: 2 },
  ],
};

```
      
### Eval output
(kind: ok) <div>{"inputs":[1],"output":[1]}</div><div>{"inputs":[2],"output":[2]}</div>