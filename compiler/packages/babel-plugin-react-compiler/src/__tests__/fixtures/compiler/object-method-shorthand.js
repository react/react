function Component() {
  let obj = {
    method() {
      return 1;
    },
  };
  return obj.method();
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{x: 1}, {a: 2}, {b: 2}],
};
