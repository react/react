// @validateRefAccessDuringRender @compilationMode:"infer"

function Component(props) {
  return (
    <Field
      name={props.name}
      ref={props.ref}
      placeholder={props.placeholder}
      disabled={props.disabled}
    />
  );
}
