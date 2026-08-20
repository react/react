function component(a, b) {
  let y = {b};
  let z = {a};
  let x = function () {
    z.a = 2;
    y.b;
  };
  return z;
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
