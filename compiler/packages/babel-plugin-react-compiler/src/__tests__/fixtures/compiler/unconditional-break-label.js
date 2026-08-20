function foo(a) {
  let x = 0;
  bar: {
    x = 1;
    break bar;
  }
  return a + x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
