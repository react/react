// @enableAssumeHooksFollowRulesOfReact true
function Component(props) {
  const x = {};
  // In enableAssumeHooksFollowRulesOfReact mode hooks freeze their inputs and return frozen values
  const y = useFoo(x);
  // Thus both x and y are frozen here, and x can be independently memoized
  bar(x, y);
  return [x, y];
}
