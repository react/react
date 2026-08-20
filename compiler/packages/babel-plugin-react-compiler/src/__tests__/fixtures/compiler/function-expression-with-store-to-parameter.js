function Component(props) {
  const mutate = (object, key, value) => {
    object.updated = true;
    object[key] = value;
  };
  const x = makeObject(props);
  mutate(x);
  return x;
}
