function component(a) {
  let z = {a: {a}};
  let x = function () {
    z.a.a();
  };
  return z;
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
