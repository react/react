function Component(props) {
  let x = null;
  if (props.cond) {
  } else {
    x = useHook();
  }
  return x;
}
