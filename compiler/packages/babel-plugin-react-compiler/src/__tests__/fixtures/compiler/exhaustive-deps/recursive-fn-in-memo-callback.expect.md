
## Input

```javascript
// @validateExhaustiveMemoizationDependencies

import {useCallback, useMemo} from 'react';

// Repro for https://github.com/react/react/issues/37270:
// A recursive function declared inside a useMemo/useCallback
// callback should not be inferred as a dependency of the memo.

function Fibonacci({n}) {
  const x = useMemo(() => {
    function fib(m) {
      if (m <= 2) return 1;
      return fib(m - 1) + fib(m - 2);
    }
    return fib(n);
  }, [n]);
  return <div>{x}</div>;
}

function useFibCallback(n) {
  return useCallback(() => {
    function fib(m) {
      if (m <= 2) return 1;
      return fib(m - 1) + fib(m - 2);
    }
    return fib(n);
  }, [n]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: Fibonacci,
  params: [{n: 6}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateExhaustiveMemoizationDependencies

import { useCallback, useMemo } from "react";

// Repro for https://github.com/react/react/issues/37270:
// A recursive function declared inside a useMemo/useCallback
// callback should not be inferred as a dependency of the memo.

function Fibonacci(t0) {
  const $ = _c(4);
  const { n } = t0;
  let t1;
  if ($[0] !== n) {
    function fib(m) {
      if (m <= 2) {
        return 1;
      }
      return fib(m - 1) + fib(m - 2);
    }
    t1 = fib(n);
    $[0] = n;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const x = t1;
  let t2;
  if ($[2] !== x) {
    t2 = <div>{x}</div>;
    $[2] = x;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  return t2;
}

function useFibCallback(n) {
  const $ = _c(2);
  let t0;
  if ($[0] !== n) {
    t0 = () => {
      function fib(m) {
        if (m <= 2) {
          return 1;
        }
        return fib(m - 1) + fib(m - 2);
      }

      return fib(n);
    };
    $[0] = n;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Fibonacci,
  params: [{ n: 6 }],
};

```
      
### Eval output
(kind: ok) <div>8</div>