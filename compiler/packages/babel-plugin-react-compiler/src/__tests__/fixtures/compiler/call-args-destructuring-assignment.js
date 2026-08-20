function Component(props) {
  let x = makeObject();
  x.foo(([x] = makeObject()));
  return x;
}
