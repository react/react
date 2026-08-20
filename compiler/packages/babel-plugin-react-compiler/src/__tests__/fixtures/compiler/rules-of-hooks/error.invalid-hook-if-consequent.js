function Component(props) {
  let x = null;
  if (props.cond) {
    x = useHook();
  }
  return x;
}
