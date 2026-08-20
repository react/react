function component() {
  let x = function (a) {
    a.foo();
  };
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: [],
  isComponent: false,
};
