// @validateRefAccessDuringRender
function Component(props) {
  return <div ref={props.ref}>{props.value}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ref: {current: null}, value: 'forwarded value'}],
};
