function f(y) {
  let x = y;
  return x + (x = 2) + x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: f,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
