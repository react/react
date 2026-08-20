import {CONST_NUMBER0, invoke} from 'shared-runtime';

function Foo() {
  const x = [{value: 0}, {value: 1}, {value: 2}];
  const param = CONST_NUMBER0;
  const foo = () => {
    return x[param].value;
  };

  return invoke(foo);
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{}],
};
