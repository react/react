import {identity} from 'shared-runtime';

function Foo() {
  const CONSTANT = 1;
  const x = {
    foo() {
      return identity(CONSTANT);
    },
  };
  return x.foo();
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{}],
};
