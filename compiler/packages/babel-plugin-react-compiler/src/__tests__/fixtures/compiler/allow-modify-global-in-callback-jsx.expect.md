
## Input

```javascript
// @enablePreserveExistingMemoizationGuarantees:false @validateExhaustiveMemoizationDependencies:false
import {useMemo} from 'react';

const someGlobal = {value: 0};

function Component({value}) {
  const onClick = () => {
    someGlobal.value = value;
  };
  return useMemo(() => {
    return <div onClick={onClick}>{someGlobal.value}</div>;
  }, []);
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 0}],
  sequentialRenders: [
    {value: 1},
    {value: 1},
    {value: 42},
    {value: 42},
    {value: 0},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enablePreserveExistingMemoizationGuarantees:false @validateExhaustiveMemoizationDependencies:false
import { useMemo } from "react";

const someGlobal = { value: 0 };

function Component(t0) {
  const $ = _c(4);
  const { value } = t0;
  let t1;
  if ($[0] !== value) {
    t1 = () => {
      someGlobal.value = value;
    };
    $[0] = value;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const onClick = t1;
  let t2;
  if ($[2] !== onClick) {
    t2 = <div onClick={onClick}>{someGlobal.value}</div>;
    $[2] = onClick;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: 0 }],
  sequentialRenders: [
    { value: 1 },
    { value: 1 },
    { value: 42 },
    { value: 42 },
    { value: 0 },
  ],
};

```
      
### Eval output
(kind: ok) <div>0</div>
<div>0</div>
<div>0</div>
<div>0</div>
<div>0</div>