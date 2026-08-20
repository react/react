// @dynamicGating:{"source":"shared-runtime"}

function Foo() {
  'use memo if(true)';
  return <div>hello world</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{}],
};
