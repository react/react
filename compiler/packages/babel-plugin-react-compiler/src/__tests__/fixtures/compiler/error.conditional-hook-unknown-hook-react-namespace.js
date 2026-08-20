function Component(props) {
  let x = null;
  if (props.cond) {
    x = React.useNonexistentHook();
  }
  return x;
}
