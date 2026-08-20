function Component(props) {
  // unused!
  const obj = makeObject();
  const _ = obj.a?.b?.(props.c);
  return null;
}
