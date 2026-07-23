function Component(props) {
  const agg = {itemCounter: props.start};
  const next = () => {
    const count = agg.itemCounter++;
    return count;
  };
  return [next(), agg.itemCounter];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{start: 1}],
  isComponent: false,
};
