function Component(props) {
  for (const x in props.value) {
    return x;
  }
  return null;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: {a: 'A!'}}],
};
