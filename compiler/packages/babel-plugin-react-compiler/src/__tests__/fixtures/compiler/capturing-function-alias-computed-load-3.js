function bar(a, b) {
  let x = [a, b];
  let y = {};
  let t = {};
  const f0 = function () {
    y = x[0][1];
    t = x[1][0];
  };
  f0();

  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: bar,
  params: [
    [1, 2],
    [2, 3],
  ],
};
