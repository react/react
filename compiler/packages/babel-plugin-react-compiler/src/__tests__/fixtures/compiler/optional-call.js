function Component(props) {
  const x = makeOptionalFunction(props);
  const y = makeObject(props);
  const z = x?.(y.a, props.a, foo(y.b), bar(props.b));
  return z;
}
