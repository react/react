// @compilationMode:"annotation"
function Component({count, maybe}) {
  'use memo';
  const value = {count};
  try {
    const unused = maybe.item;
    value.count++;
  } catch {
    value.count += 10;
  }
  return value.count;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{count: 1, maybe: null}],
  sequentialRenders: [
    {count: 1, maybe: null},
    {count: 1, maybe: null},
    {count: 1, maybe: {item: 'ok'}},
  ],
};
