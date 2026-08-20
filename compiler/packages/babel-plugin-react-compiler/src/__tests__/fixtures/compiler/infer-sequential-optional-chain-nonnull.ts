function useFoo({a}) {
  let x = [];
  x.push(a?.b.c?.d.e);
  x.push(a.b?.c.d?.e);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{a: null}],
  sequentialRenders: [
    {a: null},
    {a: null},
    {a: {}},
    {a: {b: {c: {d: {e: 42}}}}},
    {a: {b: {c: {d: {e: 43}}}}},
    {a: {b: {c: {d: {e: undefined}}}}},
    {a: {b: undefined}},
  ],
};
