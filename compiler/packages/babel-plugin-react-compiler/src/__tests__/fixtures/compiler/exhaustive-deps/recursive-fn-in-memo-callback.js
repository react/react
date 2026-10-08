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
