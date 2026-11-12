// The `\w` in the Flow suppression pattern is ASCII-only, so a non-ASCII character
// directly after `$FlowFixMe` means this is not a suppression and the function is
// still compiled.
function Component(props) {
  // $FlowFixMé[react-rule-hook]
  const x = [props.a];
  return <div>{x}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 1}],
};
