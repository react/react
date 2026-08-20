function foo(a, b, c) {
  // Construct and freeze x
  const x = makeObject(a);
  <div>{x}</div>;

  // y should depend on `x` and `b`
  const method = x.method;
  const y = method.call(x, b);
  return y;
}
