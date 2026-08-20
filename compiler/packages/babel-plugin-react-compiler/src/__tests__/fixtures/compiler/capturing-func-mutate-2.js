function component(a, b) {
  let y = {b};
  let z = {a};
  let x = function () {
    z.a = 2;
    y.b;
  };
  x();
  return z;
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: [{a: 'val1', b: 'val2'}],
  isComponent: false,
};
