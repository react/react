function Component(props) {
  let x;
  for (const y in props.value) {
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: {a: 'a', b: 'B', c: 'C!'}}],
};
