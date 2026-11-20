function Component() {
  const parameter = function self(self) {
    return self + 1;
  };
  const local = function self() {
    {
      const self = 2;
      return self;
    }
  };
  const nested = function self() {
    return function inner(self) {
      return self + 3;
    };
  };
  const unused = function self() {
    return 4;
  };
  return [parameter(1), local(), nested()(1), unused()];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};
