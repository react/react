import {identity, invoke} from 'shared-runtime';

function foo() {
  let x = 2;
  const fn1 = () => {
    const copy1 = (x = 3);
    return identity(copy1);
  };
  const fn2 = () => {
    const copy2 = (x = 4);
    return [invoke(fn1), copy2, identity(copy2)];
  };
  return invoke(fn2);
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
};
