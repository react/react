import {Stringify} from 'shared-runtime';

function foo() {
  const a = -1;
  return (
    <Stringify
      value={[
        2 * a,
        -0,
        0 === -0,
        -Infinity,
        -NaN,
        a * NaN,
        a * Infinity,
        a * -Infinity,
      ]}
    />
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
  isComponent: false,
};
