import {makeArray, print} from 'shared-runtime';

function log(strings, value) {
  print(value);
  return value;
}

function useTest() {
  return makeArray(
    log`${1}`,
    (function foo() {
      log`${2}`;
      return 2;
    })()
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: useTest,
  params: [],
};
