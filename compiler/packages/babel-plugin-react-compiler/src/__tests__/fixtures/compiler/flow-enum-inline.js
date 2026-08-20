// @flow
function Component(props) {
  enum Bool {
    True = 'true',
    False = 'false',
  }

  let bool: Bool = Bool.False;
  if (props.value) {
    bool = Bool.True;
  }
  return <div>{bool}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: true}],
};
