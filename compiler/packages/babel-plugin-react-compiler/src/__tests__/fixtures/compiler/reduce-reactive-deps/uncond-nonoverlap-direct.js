// Test that we can track non-overlapping dependencies separately.
// (not needed for correctness but for dependency granularity)
function TestNonOverlappingTracked(props) {
  let x = {};
  x.b = props.a.b;
  x.c = props.a.c;
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: TestNonOverlappingTracked,
  params: [{a: {b: 2, c: 3}}],
};
