// @expectNothingCompiled @skip
// Passed but should have failed

class ClassComponentWithHook extends React.Component {
  render() {
    React.useState();
  }
}
