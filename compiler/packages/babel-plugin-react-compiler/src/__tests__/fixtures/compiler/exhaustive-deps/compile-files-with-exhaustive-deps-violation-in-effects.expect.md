
## Input

```javascript
// @validateExhaustiveMemoizationDependencies

import {useMemo} from 'react';
import {ValidateMemoization} from 'shared-runtime';

function Component({x}) {
  useEffect(
    () => {
      console.log(x);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [
      /* intentionally missing deps */
    ]
  );

  const memo = useMemo(() => {
    return [x];
  }, [x]);

  return <ValidateMemoization inputs={[x]} output={memo} />;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateExhaustiveMemoizationDependencies

import { useMemo } from "react";
import { ValidateMemoization } from "shared-runtime";

function Component(t0) {
  const $ = _c(10);
  const { x } = t0;
  let t1;
  if ($[0] !== x) {
    t1 = () => {
      console.log(x);
    };
    $[0] = x;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  let t2;
  if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = [];
    $[2] = t2;
  } else {
    t2 = $[2];
  }
  useEffect(t1, t2);
  let t3;
  if ($[3] !== x) {
    t3 = [x];
    $[3] = x;
    $[4] = t3;
  } else {
    t3 = $[4];
  }
  const memo = t3;
  let t4;
  if ($[5] !== x) {
    t4 = [x];
    $[5] = x;
    $[6] = t4;
  } else {
    t4 = $[6];
  }
  let t5;
  if ($[7] !== memo || $[8] !== t4) {
    t5 = <ValidateMemoization inputs={t4} output={memo} />;
    $[7] = memo;
    $[8] = t4;
    $[9] = t5;
  } else {
    t5 = $[9];
  }
  return t5;
}

```
      
### Eval output
(kind: exception) Fixture not implemented