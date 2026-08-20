function useFoo({cond}) {
  let items: any = {};
  b0: {
    if (cond) {
      // Mutable range of `items` begins here, but its reactive scope block
      // should be aligned to above the if-branch
      items = [];
    } else {
      break b0;
    }
    items.push(2);
  }
  return items;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{cond: true}],
  sequentialRenders: [
    {cond: true},
    {cond: true},
    {cond: false},
    {cond: false},
    {cond: true},
  ],
};
