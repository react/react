import {createHookWrapper, mutate} from 'shared-runtime';

function useHook(a) {
  const x = {a};
  let obj = {
    method() {
      mutate(x);
      return x;
    },
  };
  return obj.method();
}

export const FIXTURE_ENTRYPOINT = {
  fn: createHookWrapper(useHook),
  params: [{x: 1}],
};
