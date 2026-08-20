
## Input

```javascript
import {useRef, useEffect} from 'react';

/**
 * The postfix increment operator should return the value before incrementing.
 * ```js
 * const id = count.current; // 0
 * count.current = count.current + 1; // 1
 * return id;
 * ```
 * The bug is that we currently increment the value before the expression is evaluated.
 * This bug does not trigger when the incremented value is a plain primitive.
 *
 * Found differences in evaluator results
 * Non-forget (expected):
 * (kind: ok) {"count":{"current":0},"updateCountPostfix":"[[ function params=0 ]]","updateCountPrefix":"[[ function params=0 ]]"}
 * logs: ['id = 0','count = 1']
 * Forget:
 * (kind: ok) {"count":{"current":0},"updateCountPostfix":"[[ function params=0 ]]","updateCountPrefix":"[[ function params=0 ]]"}
 * logs: ['id = 1','count = 1']
 */
function useFoo() {
  const count = useRef(0);
  const updateCountPostfix = () => {
    const id = count.current++;
    return id;
  };
  const updateCountPrefix = () => {
    const id = ++count.current;
    return id;
  };
  useEffect(() => {
    const id = updateCountPostfix();
    console.log(`id = ${id}`);
    console.log(`count = ${count.current}`);
  }, []);
  return {count, updateCountPostfix, updateCountPrefix};
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useRef, useEffect } from "react";

/**
 * The postfix increment operator should return the value before incrementing.
 * ```js
 * const id = count.current; // 0
 * count.current = count.current + 1; // 1
 * return id;
 * ```
 * The bug is that we currently increment the value before the expression is evaluated.
 * This bug does not trigger when the incremented value is a plain primitive.
 *
 * Found differences in evaluator results
 * Non-forget (expected):
 * (kind: ok) {"count":{"current":0},"updateCountPostfix":"[[ function params=0 ]]","updateCountPrefix":"[[ function params=0 ]]"}
 * logs: ['id = 0','count = 1']
 * Forget:
 * (kind: ok) {"count":{"current":0},"updateCountPostfix":"[[ function params=0 ]]","updateCountPrefix":"[[ function params=0 ]]"}
 * logs: ['id = 1','count = 1']
 */
function useFoo() {
  const $ = _c(5);
  const count = useRef(0);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = () => {
      count.current = count.current + 1;
      const id = count.current;
      return id;
    };
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const updateCountPostfix = t0;
  let t1;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = () => {
      const id_0 = (count.current = count.current + 1);
      return id_0;
    };
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const updateCountPrefix = t1;
  let t2;
  let t3;
  if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = () => {
      const id_1 = updateCountPostfix();
      console.log(`id = ${id_1}`);
      console.log(`count = ${count.current}`);
    };
    t3 = [];
    $[2] = t2;
    $[3] = t3;
  } else {
    t2 = $[2];
    t3 = $[3];
  }
  useEffect(t2, t3);
  let t4;
  if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
    t4 = { count, updateCountPostfix, updateCountPrefix };
    $[4] = t4;
  } else {
    t4 = $[4];
  }
  return t4;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
};

```
      