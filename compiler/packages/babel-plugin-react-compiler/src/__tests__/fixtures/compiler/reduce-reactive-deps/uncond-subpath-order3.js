// Determine that we only need to track p.a here
// Ordering of access should not matter
function TestDepsSubpathOrder3(props) {
  let x = {};
  x.c = props.a.b.c;
  x.a = props.a;
  x.b = props.a.b;
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: TestDepsSubpathOrder3,
  params: [{a: {b: {c: 2}}}],
};
