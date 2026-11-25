// @dynamicGating:{"source":"shared-runtime"} @compilationMode:"annotation"

function foo() {
  'use memo if(getTrue)';
  return <div>hello world</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [{}],
};
