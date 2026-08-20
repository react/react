function Component(props) {
  // This item is part of the receiver, should be memoized
  const item = {a: props.a};
  const items = [item];
  const mapped = items.map(item => item);
  return mapped;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: {id: 42}}],
  isComponent: false,
};
