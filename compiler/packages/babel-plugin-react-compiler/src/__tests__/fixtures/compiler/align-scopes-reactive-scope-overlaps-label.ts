import {arrayPush} from 'shared-runtime';

function useFoo({cond, value}) {
  let items;
  label: {
    items = [];
    // Mutable range of `items` begins here, but its reactive scope block
    // should be aligned to above the label-block
    if (cond) break label;
    arrayPush(items, value);
  }
  arrayPush(items, value);
  return items;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{cond: true, value: 2}],
  sequentialRenders: [
    {cond: true, value: 2},
    {cond: true, value: 2},
    {cond: true, value: 3},
    {cond: false, value: 3},
  ],
};
