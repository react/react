import {identity} from 'shared-runtime';

function useFoo({input, cond2, cond1}) {
  const x = [];
  if (cond1) {
    if (!cond2) {
      x.push(identity(input.a.b));
      return null;
    } else {
      x.push(identity(input.a.b));
    }
  } else {
    x.push(identity(input.a.b));
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{input: {b: 1}, cond1: true, cond2: false}],
  sequentialRenders: [
    {input: {a: {b: 1}}, cond1: true, cond2: true},
    {input: null, cond1: true, cond2: false},
    // preserve nullthrows
    {input: {a: {b: undefined}}, cond1: true, cond2: true},
    {input: {a: null}, cond1: true, cond2: true},
    {input: {a: {b: undefined}}, cond1: true, cond2: true},
  ],
};
