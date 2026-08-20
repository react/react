function Component(props) {
  const items = (() => {
    return [];
  })();
  items.push(props.a);
  return items;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: {}}],
};
