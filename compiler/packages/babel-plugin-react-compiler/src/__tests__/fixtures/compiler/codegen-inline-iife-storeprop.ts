import {makeArray, print} from 'shared-runtime';

function useTest() {
  let w = {};
  return makeArray(
    (w.x = 42),
    w.x,
    (function foo() {
      w.x = 999;
      return 2;
    })(),
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: useTest,
  params: [],
};
