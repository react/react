// @dynamicGating:{"source":"shared-runtime"} @compilationMode:"annotation"

function Foo() {
  'use memo if(getTrue)';
  return <div>hello world</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{}],
};
