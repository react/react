function foo() {
  const {'data-foo-bar': x, a: y, data: z} = {'data-foo-bar': 1, a: 2, data: 3};
  return [x, y, z];
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
  isComponent: false,
};
