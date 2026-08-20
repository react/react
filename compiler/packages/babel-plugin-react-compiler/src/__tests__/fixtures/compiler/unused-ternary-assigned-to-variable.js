function Component(props) {
  // unused!
  const obj = makeObject();
  const _ = obj.a ? props.b : props.c;
  return null;
}
