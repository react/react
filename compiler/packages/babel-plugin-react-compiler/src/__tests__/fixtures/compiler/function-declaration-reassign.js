function component() {
  function x(a) {
    a.foo();
  }
  x = {};
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: [],
  isComponent: false,
};
