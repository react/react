import {addOne, shallowCopy} from 'shared-runtime';

function foo(a, b, c) {
  // Construct and freeze x
  const x = shallowCopy(a);
  <div>{x}</div>;

  // y should depend on `x` and `b`
  const y = x.foo(b);
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [{foo: addOne}, 3],
  isComponent: false,
};
