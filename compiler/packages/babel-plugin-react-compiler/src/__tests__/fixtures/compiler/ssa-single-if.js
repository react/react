function foo() {
  let x = 1;
  let y = 2;

  if (y) {
    let z = x + y;
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
  isComponent: false,
};
