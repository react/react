// @validateRefAccessDuringRender @compilationMode:"infer"
function Component(props) {
  const ref = props.ref;
  ref.current = true;
  return <div>{value}</div>;
}
