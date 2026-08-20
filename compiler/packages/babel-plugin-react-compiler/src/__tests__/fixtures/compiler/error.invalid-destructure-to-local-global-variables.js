function Component(props) {
  let a;
  [a, b] = props.value;

  return [a, b];
}
