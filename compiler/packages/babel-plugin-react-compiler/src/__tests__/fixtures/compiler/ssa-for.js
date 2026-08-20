function foo() {
  let x = 1;
  for (let i = 0; i < 10; i++) {
    x += 1;
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
  isComponent: false,
};
