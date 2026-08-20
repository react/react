function Foo() {
  return (function t() {
    let x = {};
    let y = {};
    return function a(x = () => {}) {
      return (function b(y = []) {
        return [x, y];
      })();
    };
  })();
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [],
};
