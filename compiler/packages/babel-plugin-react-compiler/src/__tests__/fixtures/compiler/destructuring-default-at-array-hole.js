function Component(props) {
  // destructure slot index has a hole in the input, should return default
  const [x = 42] = props.value;
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: [, /* hole! */ 3.14]}],
};
