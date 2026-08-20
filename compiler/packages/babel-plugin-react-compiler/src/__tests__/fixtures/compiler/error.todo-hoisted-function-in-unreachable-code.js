// @compilationMode:"infer"
function Component() {
  return <Foo />;

  // This is unreachable from a control-flow perspective, but it gets hoisted
  function Foo() {}
}
