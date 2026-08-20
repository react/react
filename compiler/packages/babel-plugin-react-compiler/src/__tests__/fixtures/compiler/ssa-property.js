function foo() {
  const x = [];
  const y = {};
  y.x = x;
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
  isComponent: false,
};
