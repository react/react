function useFoo({obj, objIsNull}) {
  const x = [];
  for (let i = 0; i < 5; i++) {
    if (objIsNull) {
      continue;
    }
    x.push(obj.a);
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{obj: null, objIsNull: true}],
  sequentialRenders: [
    {obj: null, objIsNull: true},
    {obj: {a: 2}, objIsNull: false},
    // check we preserve nullthrows
    {obj: {a: undefined}, objIsNull: false},
    {obj: undefined, objIsNull: false},
    {obj: {a: undefined}, objIsNull: false},
  ],
};
