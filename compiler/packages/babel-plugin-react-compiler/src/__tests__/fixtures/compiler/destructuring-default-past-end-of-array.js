function Component(props) {
  // destructure past end of empty array, should evaluate to default
  const [x = 42] = props.value;
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: []}],
};
