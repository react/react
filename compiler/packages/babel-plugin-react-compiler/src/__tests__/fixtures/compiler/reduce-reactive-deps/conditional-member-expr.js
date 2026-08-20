// To preserve the nullthrows behavior and reactive deps of this code,
// Forget needs to add `props.a` as a dependency (since `props.a.b` is
// a conditional dependency, i.e. gated behind control flow)

function Component(props) {
  let x = [];
  x.push(props.a?.b);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: null}],
};
