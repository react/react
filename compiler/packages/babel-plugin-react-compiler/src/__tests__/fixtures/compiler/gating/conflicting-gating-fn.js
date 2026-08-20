// @gating

export const isForgetEnabled_Fixtures = () => {
  'use no forget';
  return false;
};

export function Bar(props) {
  'use forget';
  return <div>{props.bar}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: eval('Bar'),
  params: [{bar: 2}],
};
