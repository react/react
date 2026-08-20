function Component(props) {
  if (props.cond) {
    return null;
  }
  return useHook();
}
