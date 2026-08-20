// @expectNothingCompiled @compilationMode:"infer"
// Valid because components can use hooks.
function createComponentWithHook() {
  return function ComponentWithHook() {
    useHook();
  };
}
