// Test that we correctly track a subpath if the subpath itself is accessed as
// a dependency
function TestOverlappingDescendantTracked(props) {
  let x = {};
  x.b = props.a.b.c;
  x.c = props.a.b.c.x.y;
  x.a = props.a;
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: TestOverlappingDescendantTracked,
  params: [{a: {b: {c: {x: {y: 5}}}}}],
};
