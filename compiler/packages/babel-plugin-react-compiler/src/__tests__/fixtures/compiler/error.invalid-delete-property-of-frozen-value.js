function Component(props) {
  const x = makeObject();
  // freeze
  <div>{x}</div>;
  delete x.y;
  return x;
}
