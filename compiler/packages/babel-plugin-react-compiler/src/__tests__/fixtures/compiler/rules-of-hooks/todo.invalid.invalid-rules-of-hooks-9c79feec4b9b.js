// @expectNothingCompiled @skip
// Passed but should have failed

(class {
  h = () => {
    useState();
  };
});
