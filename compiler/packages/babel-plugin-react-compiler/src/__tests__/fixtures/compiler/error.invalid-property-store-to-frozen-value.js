function Component(props) {
  const x = makeObject();
  // freeze
  <div>{x}</div>;
  x.y = true;
  return x;
}
