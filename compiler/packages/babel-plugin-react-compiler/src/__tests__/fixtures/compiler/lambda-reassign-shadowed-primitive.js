function Component() {
  const x = {};
  {
    let x = 56;
    const fn = function () {
      x = 42;
    };
    fn();
  }
  return x; // should return {}
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: false,
};
