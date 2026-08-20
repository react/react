function Component(props) {
  // destructure slot index has an explicit undefined in the input, should return default
  const [x = 42] = props.value;
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: [undefined]}],
};
