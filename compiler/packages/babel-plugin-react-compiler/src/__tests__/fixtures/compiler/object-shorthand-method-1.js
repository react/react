import {createHookWrapper} from 'shared-runtime';
function useHook({a, b}) {
  return {
    x: function () {
      return [a];
    },
    y() {
      return [b];
    },
  };
}

export const FIXTURE_ENTRYPOINT = {
  fn: createHookWrapper(useHook),
  params: [{a: 1, b: 2}],
};
