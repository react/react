function useFoo({obj, objIsNull}) {
  const x = [];
  b0: {
    if (objIsNull) {
      break b0;
    } else {
      x.push(obj.a);
    }
    x.push(obj.b);
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{obj: null, objIsNull: true}],
  sequentialRenders: [
    {obj: null, objIsNull: true},
    {obj: {a: 2}, objIsNull: false},
  ],
};
