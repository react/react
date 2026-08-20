function component(props) {
  // NOTE: the temporary for the leading space was previously dropped
  const x = isMenuShown ? <Bar> {props.a ? props.b : props.c}</Bar> : null;
  return x;
}
