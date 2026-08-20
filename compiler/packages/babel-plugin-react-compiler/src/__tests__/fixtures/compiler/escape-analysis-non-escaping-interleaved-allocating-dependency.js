function Component(props) {
  // a can be independently memoized, is not mutated later
  const a = [props.a];

  // b and c are interleaved and grouped into a single scope,
  // but they are independent values. c does not escape, but
  // we need to ensure that a is memoized or else b will invalidate
  // on every render since a is a dependency.
  const b = [];
  const c = {};
  c.a = a;
  b.push(props.b);

  return b;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
