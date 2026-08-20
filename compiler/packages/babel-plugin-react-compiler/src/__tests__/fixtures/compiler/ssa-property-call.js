function foo() {
  const x = [];
  const y = {x: x};
  y.x.push([]);
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
  isComponent: false,
};
