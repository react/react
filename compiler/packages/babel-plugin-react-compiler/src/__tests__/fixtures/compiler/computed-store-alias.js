import {mutate} from 'shared-runtime';
function useHook({a, b}) {
  let y = {a};
  let x = {b};
  x['y'] = y;
  mutate(x);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useHook,
  params: [{a: 2, b: 3}],
  sequentialRenders: [
    {a: 2, b: 3},
    {a: 2, b: 3},
    {a: 3, b: 3},
  ],
};
