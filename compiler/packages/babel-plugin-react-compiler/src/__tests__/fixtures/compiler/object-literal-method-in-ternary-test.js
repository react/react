import {createHookWrapper, CONST_STRING0, CONST_STRING1} from 'shared-runtime';

function useHook({value}) {
  return {
    getValue() {
      return identity(value);
    },
  }
    ? CONST_STRING0
    : CONST_STRING1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: createHookWrapper(useHook),
  params: [{value: 0}],
};
