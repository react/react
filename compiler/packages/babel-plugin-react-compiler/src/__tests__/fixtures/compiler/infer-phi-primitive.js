function foo(a, b) {
  let x;
  if (a) {
    x = 1;
  } else {
    x = 2;
  }

  let y = x;
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [true, false],
  isComponent: false,
};
