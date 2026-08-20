function Component(props) {
  const items = props.items.map(x => x);
  const x = 42;
  return [x, items];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{items: [0, 42, null, undefined, {object: true}]}],
};
