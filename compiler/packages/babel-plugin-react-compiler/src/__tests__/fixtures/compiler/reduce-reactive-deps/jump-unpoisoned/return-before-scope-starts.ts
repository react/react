import {arrayPush} from 'shared-runtime';

function useFoo({input, cond}) {
  if (cond) {
    return {result: 'early return'};
  }

  // unconditional
  const x = [];
  arrayPush(x, input.a.b);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{input: {a: {b: 2}}, cond: false}],
  sequentialRenders: [
    {input: null, cond: true},
    {input: {a: {b: 2}}, cond: false},
    {input: null, cond: true},
    // preserve nullthrows
    {input: {}, cond: false},
    {input: {a: {b: null}}, cond: false},
    {input: {a: null}, cond: false},
    {input: {a: {b: 3}}, cond: false},
  ],
};
