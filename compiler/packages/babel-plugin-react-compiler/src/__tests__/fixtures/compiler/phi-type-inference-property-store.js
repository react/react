// @debug
function Component(props) {
  const x = {};
  let y;
  if (props.cond) {
    y = {};
  } else {
    y = {a: props.a};
  }
  // This should be inferred as `<store> y` s.t. `x` can still
  // be independently memoized. *But* this also must properly
  // extend the mutable range of the object literals in the
  // if/else branches
  y.x = x;

  return [x, y];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{cond: false, a: 'a!'}],
};
