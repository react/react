import {arrayPush, mutate} from 'shared-runtime';

function useFoo({value}) {
  let items = null;
  try {
    // Mutable range of `items` begins here, but its reactive scope block
    // should be aligned to above the try-block
    items = [];
    arrayPush(items, value);
  } catch {
    // ignore
  }
  mutate(items);
  return items;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{value: 2}],
  sequentialRenders: [{value: 2}, {value: 2}, {value: 3}],
};
