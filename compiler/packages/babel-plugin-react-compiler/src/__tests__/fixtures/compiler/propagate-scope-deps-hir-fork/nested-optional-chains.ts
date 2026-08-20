// @enablePropagateDepsInHIR

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
