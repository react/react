function Component(props) {
  const x = makeOptionalObject(props);
  const y = makeObject(props);
  const z = x?.method(y.a, props.a, foo(y.b), bar(props.b));
  return z;
}
