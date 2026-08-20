function Component(props) {
  let items = [];
  for (const key in props) {
    items.push(<div key={key}>{key}</div>);
  }
  return <div>{items}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{hello: null, world: undefined, '!': true}],
  sequentialRenders: [
    {a: null, b: null, c: null},
    {lauren: true, mofei: true, sathya: true, jason: true},
  ],
};
