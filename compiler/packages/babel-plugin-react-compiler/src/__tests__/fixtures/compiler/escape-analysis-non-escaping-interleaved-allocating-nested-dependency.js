function Component(props) {
  // a can be independently memoized, is not mutated later
  // but a is a dependnecy of b, which is a dependency of c.
  // we have to memoize a to avoid breaking memoization of b,
  // to avoid breaking memoization of c.
  const a = [props.a];

  // a can be independently memoized, is not mutated later,
  // but is a dependency of d which is part of c's scope.
  // we have to memoize b to avoid breaking memoization of c.
  const b = [a];

  // c and d are interleaved and grouped into a single scope,
  // but they are independent values. d does not escape, but
  // we need to ensure that b is memoized or else b will invalidate
  // on every render since a is a dependency. we also need to
  // ensure that a is memoized, since it's a dependency of b.
  const c = [];
  const d = {};
  d.b = b;
  c.push(props.b);

  return c;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
