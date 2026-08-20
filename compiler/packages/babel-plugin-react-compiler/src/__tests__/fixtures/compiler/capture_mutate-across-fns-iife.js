function component(a) {
  let z = {a};
  (function () {
    (function () {
      z.b = 1;
    })();
  })();
  return z;
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: [2],
};
