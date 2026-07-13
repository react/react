
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees

import {identity, Stringify} from 'shared-runtime';

/**
 * Repro from https://github.com/facebook/react/issues/34262
 *
 * The compiler memoizes more precisely than the original code, with two reactive scopes:
 * - One for `transform(input)` with `input` as dep
 * - One for `{value}` with `value` as dep
 *
 * Previously ValidatePreservedManualMemoization rejected this input, because
 * the original memoization had `object` depending on `input` but we split the scope per above,
 * and the scope for the FinishMemoize instruction is the second scope which depends on `value`
 */
function useInputValue(input) {
  const object = React.useMemo(() => {
    const {value} = identity(input);
    return {value};
  }, [input]);
  return object;
}

function Component() {
  return <Stringify value={useInputValue({value: 42}).value} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validatePreserveExistingMemoizationGuarantees

import { identity, Stringify } from "shared-runtime";

/**
 * Repro from https://github.com/facebook/react/issues/34262
 *
 * The compiler memoizes more precisely than the original code, with two reactive scopes:
 * - One for `transform(input)` with `input` as dep
 * - One for `{value}` with `value` as dep
 *
 * Previously ValidatePreservedManualMemoization rejected this input, because
 * the original memoization had `object` depending on `input` but we split the scope per above,
 * and the scope for the FinishMemoize instruction is the second scope which depends on `value`
 */
function useInputValue(input) {
  const $ = _c(4);
  let t0;
  if ($[0] !== input) {
    t0 = identity(input);
    $[0] = input;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const { value } = t0;
  let t1;
  if ($[2] !== value) {
    t1 = { value };
    $[2] = value;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  const object = t1;

  return object;
}

function Component() {
  const $ = _c(3);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = { value: 42 };
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const t1 = useInputValue(t0);
  let t2;
  if ($[1] !== t1.value) {
    t2 = <Stringify value={t1.value} />;
    $[1] = t1.value;
    $[2] = t2;
  } else {
    t2 = $[2];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) <div>{"value":42}</div>