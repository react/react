import {identity, createHookWrapper} from 'shared-runtime';

function useHook({isCond, value}) {
  return isCond
    ? identity({
        getValue() {
          return value;
        },
      })
    : 42;
}

export const FIXTURE_ENTRYPOINT = {
  fn: createHookWrapper(useHook),
  params: [{isCond: true, value: 0}],
};
