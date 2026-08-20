function Component(props) {
  const x = makeObject();
  return x?.[foo(props.value)];
}
