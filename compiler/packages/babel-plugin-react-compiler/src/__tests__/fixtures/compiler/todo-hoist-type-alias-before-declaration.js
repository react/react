// @flow @compilationMode(infer)
function Component(props: {data: Array<{label: string, value: number}>}) {
  const getLabel = (item: ItemType): string => item.label;
  const items = props.data.map(getLabel);
  type ItemType = {label: string, value: number};
  return <div>{items}</div>;
}
