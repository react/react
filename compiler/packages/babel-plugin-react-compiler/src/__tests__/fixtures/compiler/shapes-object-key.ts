import {arrayPush} from 'shared-runtime';

function useFoo({a, b}) {
  const obj = {a};
  arrayPush(Object.keys(obj), b);
  return obj;
}
export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{a: 2, b: 3}],
};
