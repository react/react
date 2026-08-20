function Component(props) {
  const x = props.cond ? useA : useB;
  return x();
}
