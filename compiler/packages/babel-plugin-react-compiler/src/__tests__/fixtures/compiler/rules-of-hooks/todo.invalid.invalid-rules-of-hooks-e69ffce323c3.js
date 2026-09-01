// @expectNothingCompiled @skip
// Passed but should have failed

(class {
  useHook = () => {
    useState();
  };
});
