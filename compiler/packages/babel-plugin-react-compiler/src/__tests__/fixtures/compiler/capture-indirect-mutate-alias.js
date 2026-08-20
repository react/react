function component(a) {
  let x = {a};
  const f0 = function () {
    let q = x;
    const f1 = function () {
      q.b = 1;
    };
    f1();
  };
  f0();

  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
