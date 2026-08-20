function Component(props) {
  const object = makeObject(props);
  return object?.[props.key];
}
