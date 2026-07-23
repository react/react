// @validateRefAccessDuringRender @compilationMode:"infer"
function TextArea(props) {
  return <TextInput ref={props.ref} type="body" />;
}
