function foo() {
  const {'data-foo-bar': t} = {'data-foo-bar': 1};
  return t;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
  isComponent: false,
};
