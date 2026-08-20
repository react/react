import {makeArray, print} from 'shared-runtime';

function useTest() {
  let w = {};
  return makeArray(
    (w = 42),
    w,
    (function foo() {
      w = 999;
      return 2;
    })(),
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: useTest,
  params: [],
};
