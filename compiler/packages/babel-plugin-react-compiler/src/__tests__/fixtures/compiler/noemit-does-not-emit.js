// @noEmit

function Component(props) {
  const x = props.a;
  return <div>{x}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 'hello'}],
};
