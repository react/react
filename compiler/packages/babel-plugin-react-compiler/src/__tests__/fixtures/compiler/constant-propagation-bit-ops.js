import {Stringify} from 'shared-runtime';

function foo() {
  return (
    <Stringify
      value={[
        123.45 | 0,
        123.45 & 0,
        123.45 ^ 0,
        123 << 0,
        123 >> 0,
        123 >>> 0,
        123.45 | 1,
        123.45 & 1,
        123.45 ^ 1,
        123 << 1,
        123 >> 1,
        123 >>> 1,
        3 ** 2,
        3 ** 2.5,
        3.5 ** 2,
        2 ** (3 ** 0.5),
        4 % 2,
        4 % 2.5,
        4 % 3,
        4.5 % 2,
      ]}
    />
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
  isComponent: false,
};
