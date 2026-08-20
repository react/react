function Component(props) {
  const _ = 42;
  return props.value;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 42}],
};
