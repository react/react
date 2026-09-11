function foo(x) {
  const y = {0x10: x};
  const {16: z} = y;
  return z;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [10],
  isComponent: false,
};
