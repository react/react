
## Input

```javascript
import {useState, useMemo} from 'react';

function Component(props) {
  const [x] = useState(0);
  const expensiveNumber = useMemo(() => calculateExpensiveNumber(x), [x]);

  return <div>{expensiveNumber}</div>;
}

function Component2(props) {
  const [x] = useState(0);
  const expensiveNumber = useMemo(() => calculateExpensiveNumber(x), [x]);

  return <div>{expensiveNumber}</div>;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useState, useMemo } from "react";

function Component(props) {
  const $ = _c(4);
  const [x] = useState(0);
  let t0;
  if ($[0] !== x) {
    t0 = calculateExpensiveNumber(x);
    $[0] = x;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const expensiveNumber = t0;
  let t1;
  if ($[2] !== expensiveNumber) {
    t1 = <div>{expensiveNumber}</div>;
    $[2] = expensiveNumber;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  return t1;
}

function Component2(props) {
  const $ = _c(4);
  const [x] = useState(0);
  let t0;
  if ($[0] !== x) {
    t0 = calculateExpensiveNumber(x);
    $[0] = x;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const expensiveNumber = t0;
  let t1;
  if ($[2] !== expensiveNumber) {
    t1 = <div>{expensiveNumber}</div>;
    $[2] = expensiveNumber;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  return t1;
}

```
      