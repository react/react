function Component(props) {
  const items = (() => {
    if (props.cond) {
      return [];
    } else {
      return null;
    }
  })();
  items?.push(props.a);
  return items;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: {}}],
};
