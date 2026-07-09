// @enableFunctionOutlining

function Component() {
  const object = {
    method() {
      return false;
    },
    property: () => {
      return true;
    },
  };
  return [object.method(), object.property()];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};
