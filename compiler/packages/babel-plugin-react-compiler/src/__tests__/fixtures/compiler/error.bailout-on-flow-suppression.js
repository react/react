// @enableFlowSuppressions

function Foo(props) {
  // $FlowFixMe[react-rule-hook]
  useX();
  return null;
}
