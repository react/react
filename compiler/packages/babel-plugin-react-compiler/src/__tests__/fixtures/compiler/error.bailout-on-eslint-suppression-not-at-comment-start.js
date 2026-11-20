// @validateExhaustiveMemoizationDependencies:false

function Component(props) {
  // prettier-ignore eslint-disable-next-line react-hooks/rules-of-hooks
  const x = [props.a];
  return <div>{x}</div>;
}
