function bar(a) {
  let x = [a];
  let y = {};
  (function () {
    y = x[0].a[1];
  })();

  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: bar,
  params: [{a: ['val1', 'val2']}],
  isComponent: false,
};
