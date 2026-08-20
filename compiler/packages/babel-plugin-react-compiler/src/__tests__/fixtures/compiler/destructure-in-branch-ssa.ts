function useFoo(props: {
  x?: string;
  y?: string;
  z?: string;
  doDestructure: boolean;
}) {
  let x = null;
  let y = null;
  let z = null;
  const myList = [];
  if (props.doDestructure) {
    ({x, y, z} = props);

    myList.push(z);
  }
  return {
    x,
    y,
    myList,
  };
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{x: 'hello', y: 'world', doDestructure: true}],
};
