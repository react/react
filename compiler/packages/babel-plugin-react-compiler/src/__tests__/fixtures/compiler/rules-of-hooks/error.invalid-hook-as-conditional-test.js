function Component(props) {
  const x = props.cond ? (useFoo ? 1 : 2) : 3;
  return x;
}
