
## Input

```javascript
// @compilationMode:"infer"
import {useEffect, useState} from 'react';

function createCounter(step) {
  const Counter = () => {
    const [count, setCount] = useState(0);
    useEffect(() => {
      setCount(prev => prev + step);
    }, []);
    return count;
  };
  return Counter;
}

export const FIXTURE_ENTRYPOINT = {
  fn: createCounter,
  params: [1],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @compilationMode:"infer"
import { useEffect, useState } from "react";

function createCounter(step) {
  const Counter = () => {
    const $ = _c(2);
    const [count, setCount] = useState(0);
    let t0;
    let t1;
    if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
      t0 = () => {
        setCount(_temp);
      };
      t1 = [];
      $[0] = t0;
      $[1] = t1;
    } else {
      t0 = $[0];
      t1 = $[1];
    }
    useEffect(t0, t1);
    return count;
  };
  function _temp(prev) {
    return prev + step;
  }

  return Counter;
}

export const FIXTURE_ENTRYPOINT = {
  fn: createCounter,
  params: [1],
};

```
      
### Eval output
(kind: ok) "[[ function params=0 ]]"