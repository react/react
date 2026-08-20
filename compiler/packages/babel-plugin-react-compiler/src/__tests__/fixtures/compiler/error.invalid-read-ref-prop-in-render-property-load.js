// @validateRefAccessDuringRender @compilationMode:"infer"
function Component(props) {
  const value = props.ref.current;
  return <div>{value}</div>;
}
