// @validateRefAccessDuringRender @compilationMode:"infer"
function Component({ref}) {
  const value = ref.current;
  return <div>{value}</div>;
}
