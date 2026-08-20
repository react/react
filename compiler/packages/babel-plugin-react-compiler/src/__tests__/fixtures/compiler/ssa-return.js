function foo() {
  let x = 1;
  if (x === 1) {
    x = 2;
  }

  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
  isComponent: false,
};
