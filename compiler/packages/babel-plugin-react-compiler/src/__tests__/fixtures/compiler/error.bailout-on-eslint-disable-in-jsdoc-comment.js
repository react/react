// @validateExhaustiveMemoizationDependencies:false

function Component(props) {
  /**
   * eslint-disable react-hooks/rules-of-hooks
   */
  const x = [props.a];
  return <div>{x}</div>;
}
