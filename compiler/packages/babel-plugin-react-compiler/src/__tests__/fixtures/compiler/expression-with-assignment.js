function f() {
  let x = 1;
  return x + (x = 2) + x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: f,
  params: [],
  isComponent: false,
};
