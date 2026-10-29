function Component(props) {
  let key = null;
  for (key in props.value) {
  }
  return <div>{key}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: {a: 1, b: 2}}],
};
