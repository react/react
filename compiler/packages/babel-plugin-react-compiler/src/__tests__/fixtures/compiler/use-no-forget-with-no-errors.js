// @expectNothingCompiled
function Component() {
  'use no forget';
  return <div>Hello World</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: true,
};
