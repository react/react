// @flow
function Component(props) {
  const [x = ([]: Array<number>)] = props.y;
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{y: []}],
};
