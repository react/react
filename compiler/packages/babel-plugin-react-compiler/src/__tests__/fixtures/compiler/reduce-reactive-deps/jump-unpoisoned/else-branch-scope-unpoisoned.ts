import {identity} from 'shared-runtime';

function useFoo({input, cond}) {
  const x = [];
  label: {
    if (cond) {
      break label;
    } else {
      x.push(identity(input.a.b));
    }
  }
  return x[0];
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
