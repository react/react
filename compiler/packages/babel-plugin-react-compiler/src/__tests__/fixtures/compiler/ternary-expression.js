function ternary(props) {
  const a = props.a && props.b ? props.c || props.d : (props.e ?? props.f);
  const b = props.a ? (props.b && props.c ? props.d : props.e) : props.f;
  return a ? b : null;
}

export const FIXTURE_ENTRYPOINT = {
  fn: ternary,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
