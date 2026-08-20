function Component(props) {
  const filtered = props.items.filter(item => item != null);
  return filtered;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [
    {
      items: [{a: true}, null, true, false, null, 'string', 3.14, null, [null]],
    },
  ],
};
