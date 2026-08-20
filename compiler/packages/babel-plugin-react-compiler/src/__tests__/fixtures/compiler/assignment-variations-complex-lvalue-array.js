function foo() {
  const a = [[1]];
  const first = a.at(0);
  first.set(0, 2);
  return a;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
  isComponent: false,
};
