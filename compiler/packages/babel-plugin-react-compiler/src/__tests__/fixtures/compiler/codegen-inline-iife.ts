import {makeArray, print} from 'shared-runtime';

function useTest() {
  return makeArray<number | void>(
    print(1),
    (function foo() {
      print(2);
      return 2;
    })(),
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: useTest,
  params: [],
};
