import {mutate} from 'shared-runtime';

function useHook({a, b}) {
  let z = {a};
  {
    let z = {b};
    (function () {
      mutate(z);
    })();
  }
  return z;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useHook,
  params: [{a: 2, b: 3}],
  sequentialRenders: [
    {a: 2, b: 3},
    {a: 2, b: 3},
    {a: 2, b: 4},
    {a: 3, b: 4},
  ],
};
