// @flow @compilationMode:"infer"

function Foo(props: {items: Array<{interface: string}>}) {
  const keys = props.items.map(x => x.interface);
  return <div>{keys.join(',')}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{items: [{interface: 'eth0'}, {interface: 'eth1'}]}],
};
