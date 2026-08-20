import {createHookWrapper} from 'shared-runtime';

function useHook({a, b, c}) {
  return {
    x: [a],
    y() {
      return [b];
    },
    z: {c},
  };
}

export const FIXTURE_ENTRYPOINT = {
  fn: createHookWrapper(useHook),
  params: [{a: 1, b: 2, c: 2}],
};
