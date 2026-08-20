import {identity} from 'shared-runtime';

function useFoo({input, cond, hasAB}) {
  const x = [];
  if (cond) {
    if (!hasAB) {
      return null;
    } else {
      x.push(identity(input.a.b));
    }
    x.push(identity(input.a.b));
  } else {
    x.push(identity(input.a.b));
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{input: {b: 1}, cond: true, hasAB: false}],
  sequentialRenders: [
    {input: {a: {b: 1}}, cond: true, hasAB: true},
    {input: null, cond: true, hasAB: false},
    // preserve nullthrows
    {input: {a: {b: undefined}}, cond: true, hasAB: true},
    {input: {a: null}, cond: true, hasAB: true},
    {input: {a: {b: undefined}}, cond: true, hasAB: true},
  ],
};
