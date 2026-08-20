// @dynamicGating:{"source":"shared-runtime"} @panicThreshold:"none" @loggerTestOnly

function Foo() {
  'use memo if(getTrue)';
  'use memo if(getFalse)';
  return <div>hello world</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{}],
};
