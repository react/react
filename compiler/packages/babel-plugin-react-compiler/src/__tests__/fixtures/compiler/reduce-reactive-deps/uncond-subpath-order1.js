// Determine that we only need to track p.a here
// Ordering of access should not matter
function TestDepsSubpathOrder1(props) {
  let x = {};
  x.b = props.a.b;
  x.a = props.a;
  x.c = props.a.b.c;
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: TestDepsSubpathOrder1,
  params: [{a: {b: {c: 2}}}],
};
