function Component(props) {
  const x = makeObject();
  return x.y?.[props.a?.[props.b?.[props.c]]];
}
