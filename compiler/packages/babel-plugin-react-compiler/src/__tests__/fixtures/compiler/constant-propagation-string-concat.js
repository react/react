function foo() {
  const a = 'a' + 'b';
  const c = 'c';
  return a + c;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
  isComponent: false,
};
