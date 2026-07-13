// @expectNothingCompiled @compilationMode:"infer"
// Takes multiple parameters - not a component!
function Component(foo, bar) {
  return <div />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [null, null],
};
