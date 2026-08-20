import {identity} from 'shared-runtime';

function useFoo({input, inputHasAB, inputHasABC}) {
  const x = [];
  if (!inputHasABC) {
    x.push(identity(input.a));
    if (!inputHasAB) {
      return null;
    }
    x.push(identity(input.a.b));
  } else {
    x.push(identity(input.a.b.c));
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{input: {b: 1}, inputHasAB: false, inputHasABC: false}],
};
