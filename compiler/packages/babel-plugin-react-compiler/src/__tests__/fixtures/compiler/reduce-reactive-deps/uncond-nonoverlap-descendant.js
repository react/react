// Test that we can track non-overlapping dependencies separately.
// (not needed for correctness but for dependency granularity)
function TestNonOverlappingDescendantTracked(props) {
  let x = {};
  x.a = props.a.x.y;
  x.b = props.b;
  x.c = props.a.c.x.y.z;
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: TestNonOverlappingDescendantTracked,
  params: [{a: {x: {}, c: {x: {y: {z: 3}}}}}],
};
