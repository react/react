// @validateRefAccessDuringRender

/**
 * Regression test for https://github.com/facebook/react/issues/34775
 * Forwarding `props.ref` to a child component should not cause sibling
 * property reads from the same `props` object to be flagged as ref accesses.
 */
function Field(props) {
  return (
    <Control
      ref={props.ref}
      placeholder={props.placeholder}
      disabled={props.disabled}
    />
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Field,
  params: [{placeholder: 'hello', disabled: false}],
};
