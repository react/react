
## Input

```javascript
import {identity} from 'shared-runtime';

/**
 * identity(...)?.toString() is the outer optional, and prop?.value is the inner
 * one.
 * Note that prop?.
 */
function useFoo({
  prop1,
  prop2,
  prop3,
  prop4,
  prop5,
  prop6,
}: {
  prop1: null | {value: number};
  prop2: null | {inner: {value: number}};
  prop3: null | {fn: (val: any) => NonNullable<object>};
  prop4: null | {inner: {value: number}};
  prop5: null | {fn: (val: any) => NonNullable<object>};
  prop6: null | {inner: {value: number}};
}) {
  // prop1?.value should be hoisted as the dependency of x
  const x = identity(prop1?.value)?.toString();

  // prop2?.inner.value should be hoisted as the dependency of y
  const y = identity(prop2?.inner.value)?.toString();

  // prop3 and prop4?.inner should be hoisted as the dependency of z
  const z = prop3?.fn(prop4?.inner.value).toString();

  // prop5 and prop6?.inner should be hoisted as the dependency of zz
  const zz = prop5?.fn(prop6?.inner.value)?.toString();
  return [x, y, z, zz];
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [
    {
      prop1: null,
      prop2: null,
      prop3: null,
      prop4: null,
      prop5: null,
      prop6: null,
    },
  ],
  sequentialRenders: [
    {
      prop1: null,
      prop2: null,
      prop3: null,
      prop4: null,
      prop5: null,
      prop6: null,
    },
    {
      prop1: {value: 2},
      prop2: {inner: {value: 3}},
      prop3: {fn: identity},
      prop4: {inner: {value: 4}},
      prop5: {fn: identity},
      prop6: {inner: {value: 4}},
    },
    {
      prop1: {value: 2},
      prop2: {inner: {value: 3}},
      prop3: {fn: identity},
      prop4: {inner: {value: 4}},
      prop5: {fn: identity},
      prop6: {inner: {value: undefined}},
    },
    {
      prop1: {value: 2},
      prop2: {inner: {value: undefined}},
      prop3: {fn: identity},
      prop4: {inner: {value: undefined}},
      prop5: {fn: identity},
      prop6: {inner: {value: undefined}},
    },
    {
      prop1: {value: 2},
      prop2: {},
      prop3: {fn: identity},
      prop4: {},
      prop5: {fn: identity},
      prop6: {inner: {value: undefined}},
    },
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { identity } from "shared-runtime";

/**
 * identity(...)?.toString() is the outer optional, and prop?.value is the inner
 * one.
 * Note that prop?.
 */
function useFoo(t0) {
  const $ = _c(15);
  const { prop1, prop2, prop3, prop4, prop5, prop6 } = t0;
  let t1;
  if ($[0] !== prop1?.value) {
    t1 = identity(prop1?.value)?.toString();
    $[0] = prop1?.value;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const x = t1;
  let t2;
  if ($[2] !== prop2?.inner.value) {
    t2 = identity(prop2?.inner.value)?.toString();
    $[2] = prop2?.inner.value;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  const y = t2;
  let t3;
  if ($[4] !== prop3 || $[5] !== prop4?.inner) {
    t3 = prop3?.fn(prop4?.inner.value).toString();
    $[4] = prop3;
    $[5] = prop4?.inner;
    $[6] = t3;
  } else {
    t3 = $[6];
  }
  const z = t3;
  let t4;
  if ($[7] !== prop5 || $[8] !== prop6?.inner) {
    t4 = prop5?.fn(prop6?.inner.value)?.toString();
    $[7] = prop5;
    $[8] = prop6?.inner;
    $[9] = t4;
  } else {
    t4 = $[9];
  }
  const zz = t4;
  let t5;
  if ($[10] !== x || $[11] !== y || $[12] !== z || $[13] !== zz) {
    t5 = [x, y, z, zz];
    $[10] = x;
    $[11] = y;
    $[12] = z;
    $[13] = zz;
    $[14] = t5;
  } else {
    t5 = $[14];
  }
  return t5;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [
    {
      prop1: null,
      prop2: null,
      prop3: null,
      prop4: null,
      prop5: null,
      prop6: null,
    },
  ],

  sequentialRenders: [
    {
      prop1: null,
      prop2: null,
      prop3: null,
      prop4: null,
      prop5: null,
      prop6: null,
    },
    {
      prop1: { value: 2 },
      prop2: { inner: { value: 3 } },
      prop3: { fn: identity },
      prop4: { inner: { value: 4 } },
      prop5: { fn: identity },
      prop6: { inner: { value: 4 } },
    },
    {
      prop1: { value: 2 },
      prop2: { inner: { value: 3 } },
      prop3: { fn: identity },
      prop4: { inner: { value: 4 } },
      prop5: { fn: identity },
      prop6: { inner: { value: undefined } },
    },
    {
      prop1: { value: 2 },
      prop2: { inner: { value: undefined } },
      prop3: { fn: identity },
      prop4: { inner: { value: undefined } },
      prop5: { fn: identity },
      prop6: { inner: { value: undefined } },
    },
    {
      prop1: { value: 2 },
      prop2: {},
      prop3: { fn: identity },
      prop4: {},
      prop5: { fn: identity },
      prop6: { inner: { value: undefined } },
    },
  ],
};

```
      
### Eval output
(kind: ok) [null,null,null,null]
["2","3","4","4"]
["2","3","4",null]
[[ (exception in render) TypeError: Cannot read properties of undefined (reading 'toString') ]]
[[ (exception in render) TypeError: Cannot read properties of undefined (reading 'value') ]]