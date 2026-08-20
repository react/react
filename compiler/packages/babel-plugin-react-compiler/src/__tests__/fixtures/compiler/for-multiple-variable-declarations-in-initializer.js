function Component(props) {
  const items = [];

  for (let i = 0, length = props.items.length; i < length; i++) {
    items.push(props.items[i]);
  }

  return items;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{items: ['a', 'b', 42]}],
};
