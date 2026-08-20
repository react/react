function foo() {
  let y = 0;
  for (const x = 100; x < 10; x) {
    y = y + 1;
  }
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
  isComponent: false,
};
