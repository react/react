function foo(a, b, c) {
  let d, g, n, o;
  [
    d,
    [
      {
        e: {f: g},
      },
    ],
  ] = a;
  ({
    l: {
      m: [[n]],
    },
    o,
  } = b);
  return {d, g, n, o};
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
