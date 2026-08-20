// Compile this with Babel.
// babel --config-file ./babel.config.json BabelClasses.js --out-file BabelClasses-compiled.js --source-maps

export class BabelClass extends React.Component {
  render() {
    return this.props.children;
  }
}

export class BabelClassWithFields extends React.Component {
  // These compile to defineProperty which can break some interception techniques.
  props;
  state = {};
  render() {
    return this.props.children;
  }
}
