// @enableEmitInstrumentForget @compilationMode:"annotation" @gating

function Bar(props) {
  'use forget';
  return <div>{props.bar}</div>;
}

function NoForget(props) {
  return <Bar>{props.noForget}</Bar>;
}

function Foo(props) {
  'use forget';
  if (props.bar < 0) {
    return props.children;
  }
  return (
    <Foo bar={props.bar - 1}>
      <NoForget />
    </Foo>
  );
}

global.DEV = true;
export const FIXTURE_ENTRYPOINT = {
  fn: eval('Foo'),
  params: [{bar: 2}],
};
