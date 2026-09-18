import {Stringify} from 'shared-runtime';

function foo() {
  const big = 1e999;
  const keys = {1e999: 'a', 1e21: 'b', 1.5e-7: 'c'};
  return (
    <Stringify
      value={[
        big,
        -1e999,
        1e999 > Number.MAX_VALUE,
        `${1e999}`,
        Object.keys(keys),
      ]}
    />
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
  isComponent: false,
};
