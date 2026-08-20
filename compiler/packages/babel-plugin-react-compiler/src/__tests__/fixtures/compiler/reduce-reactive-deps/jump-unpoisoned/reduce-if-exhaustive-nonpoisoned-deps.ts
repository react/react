import {identity} from 'shared-runtime';

function useFoo({input, hasAB, returnNull}) {
  const x = [];
  if (!hasAB) {
    x.push(identity(input.a));
    if (!returnNull) {
      return null;
    }
  } else {
    x.push(identity(input.a.b));
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{input: {b: 1}, hasAB: false, returnNull: false}],
};
