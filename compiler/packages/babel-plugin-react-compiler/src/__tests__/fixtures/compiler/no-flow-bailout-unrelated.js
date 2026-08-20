// @enableFlowSuppressions

function useX() {}

function Foo(props) {
  // $FlowFixMe[incompatible-type]
  useX();
  return null;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{}],
};
