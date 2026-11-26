import {Stringify} from 'shared-runtime';

function foo() {
  return (
    <Stringify
      value={[
        `${2 ** 55}`,
        `${2 ** 60}`,
        `${-(2 ** 62)}`,
        `${2 ** -25}`,
        `${1000000000000000.25}`,
        `${2 ** 53}`,
        `${0.1}`,
        `${1e21}`,
        `${1e-7}`,
        `${123.456}`,
      ]}
    />
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
  isComponent: false,
};
