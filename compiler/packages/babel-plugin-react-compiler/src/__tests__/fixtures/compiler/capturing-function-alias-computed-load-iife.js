function bar(a) {
  let x = [a];
  let y = {};
  (function () {
    y = x[0];
  })();

  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: bar,
  params: ['TodoAdd'],
};
