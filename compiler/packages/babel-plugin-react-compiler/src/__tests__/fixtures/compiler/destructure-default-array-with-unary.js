function Component(props) {
  const [x = [-1, 1]] = props.value;
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: []}],
};
