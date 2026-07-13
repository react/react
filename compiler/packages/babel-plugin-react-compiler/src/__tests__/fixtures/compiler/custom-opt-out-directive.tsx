// @expectNothingCompiled @customOptOutDirectives:["use todo memo"]
function Component() {
  'use todo memo';
  return <div>hello world!</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};
