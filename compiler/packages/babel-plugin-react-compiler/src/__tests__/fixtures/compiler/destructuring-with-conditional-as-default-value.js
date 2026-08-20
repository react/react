function Component(props) {
  const [x = true ? 1 : 0] = props.y;
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{y: []}],
};
