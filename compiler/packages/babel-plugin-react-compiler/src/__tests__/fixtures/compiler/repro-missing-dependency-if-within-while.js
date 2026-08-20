const someGlobal = true;
export default function Component(props) {
  const {b} = props;
  const items = [];
  let i = 0;
  while (i < 10) {
    if (someGlobal) {
      items.push(<div key={i}>{b}</div>);
      i++;
    }
  }
  return <>{items}</>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{b: 42}],
  sequentialRenders: [
    {b: 0},
    {b: 0},
    {b: 42},
    {b: 42},
    {b: 0},
    {b: 42},
    {b: 0},
    {b: 42},
  ],
};
