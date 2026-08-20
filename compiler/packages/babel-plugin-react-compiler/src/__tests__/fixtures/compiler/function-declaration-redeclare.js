function component() {
  function x(a) {
    a.foo();
  }
  function x() {}
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: [],
  isComponent: false,
};
