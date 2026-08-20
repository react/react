// @gating @compilationMode:"annotation"
export function Bar(props) {
  'use forget';
  return <div>{props.bar}</div>;
}

export function NoForget(props) {
  return <Bar>{props.noForget}</Bar>;
}

export function Foo(props) {
  'use forget';
  return <Foo>{props.bar}</Foo>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: eval('Bar'),
  params: [{bar: 2}],
};
