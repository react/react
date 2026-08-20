import {createHookWrapper, mutate, mutateAndReturn} from 'shared-runtime';
function useHook({value}) {
  const x = mutateAndReturn({value});
  const obj = {
    getValue() {
      return value;
    },
  };
  mutate(x);
  return obj;
}

export const FIXTURE_ENTRYPOINT = {
  fn: createHookWrapper(useHook),
  params: [{value: 0}],
};
