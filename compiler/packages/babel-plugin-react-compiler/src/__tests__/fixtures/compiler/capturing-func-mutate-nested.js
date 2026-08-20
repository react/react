function component(a) {
  let y = {b: {a}};
  let x = function () {
    y.b.a = 2;
  };
  x();
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
