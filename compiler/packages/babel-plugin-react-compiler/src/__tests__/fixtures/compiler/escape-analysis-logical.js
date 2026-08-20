function Component(props) {
  const a = [props.a];
  const b = [props.b];
  const c = [props.c];
  // We don't do constant folding for non-primitive values (yet) so we consider
  // that any of a, b, or c could return here
  return (a && b) || c;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
