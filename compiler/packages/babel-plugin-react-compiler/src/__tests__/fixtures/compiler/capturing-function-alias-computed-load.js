function bar(a) {
  let x = [a];
  let y = {};
  const f0 = function () {
    y = x[0];
  };
  f0();

  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: bar,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
