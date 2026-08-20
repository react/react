function component(a) {
  let z = {a};
  const f0 = function () {
    const f1 = function () {
      z.b = 1;
    };
    f1();
  };
  f0();
  return z;
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
