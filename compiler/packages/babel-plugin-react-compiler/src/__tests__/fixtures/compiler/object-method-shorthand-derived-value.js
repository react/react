import {createHookWrapper, mutateAndReturn} from 'shared-runtime';
function useHook({value}) {
  const x = mutateAndReturn({value});
  const obj = {
    getValue() {
      return x;
    },
  };
  return obj;
}

export const FIXTURE_ENTRYPOINT = {
  fn: createHookWrapper(useHook),
  params: [{value: 0}],
};
