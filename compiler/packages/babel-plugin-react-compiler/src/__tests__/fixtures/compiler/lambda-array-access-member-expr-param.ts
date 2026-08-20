import {invoke} from 'shared-runtime';

function Foo() {
  const x = [{value: 0}, {value: 1}, {value: 2}];
  const foo = (param: number) => {
    return x[param].value;
  };

  return invoke(foo, 1);
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{}],
};
