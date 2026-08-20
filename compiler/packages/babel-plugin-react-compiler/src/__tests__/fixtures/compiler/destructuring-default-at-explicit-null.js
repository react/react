function Component(props) {
  // destructure slot index has an explicit null in the input, should return null (not the default)
  const [x = 42] = props.value;
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: [null]}],
};
