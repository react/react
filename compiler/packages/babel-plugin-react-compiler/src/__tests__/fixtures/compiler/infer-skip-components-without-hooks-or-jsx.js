// @expectNothingCompiled @compilationMode:"infer"
// This component is skipped bc it doesn't call any hooks or
// use JSX:
function Component(props) {
  return render();
}
