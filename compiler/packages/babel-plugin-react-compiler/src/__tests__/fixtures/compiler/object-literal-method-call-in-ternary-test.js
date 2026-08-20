import {
  createHookWrapper,
  identity,
  CONST_STRING0,
  CONST_STRING1,
} from 'shared-runtime';

function useHook({value}) {
  return {
    getValue() {
      return identity(value);
    },
  }.getValue()
    ? CONST_STRING0
    : CONST_STRING1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: createHookWrapper(useHook),
  params: [{value: 0}],
};
