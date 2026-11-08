// A function declaration that shadows a parameter is fine to lower as a
// reassignment when nothing observes the parameter before the declaration.
function Component(props) {
  function props() {}
  return <p>{typeof props}</p>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{x: 1}],
};
