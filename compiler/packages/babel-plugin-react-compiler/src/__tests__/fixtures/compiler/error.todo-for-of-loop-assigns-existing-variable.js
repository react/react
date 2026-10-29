function Component(props) {
  let item = null;
  for (item of props.items) {
    if (item.selected) {
      break;
    }
  }
  return <div>{item?.name}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{items: [{name: 'a'}, {name: 'b', selected: true}]}],
};
