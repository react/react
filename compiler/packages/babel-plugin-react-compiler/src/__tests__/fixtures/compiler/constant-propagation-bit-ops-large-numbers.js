import {Stringify} from 'shared-runtime';

function foo() {
  return (
    <Stringify
      value={[
        (2 ** 64) | 0,
        -(2 ** 64) | 0,
        1e21 | 0,
        -1e21 | 0,
        1e21 & -1,
        1e21 ^ 0,
        1e21 >>> 0,
        (2 ** 64) >> 4,
        1e21 << 1,
      ]}
    />
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
  isComponent: false,
};
