function Foo() {
  const x = {};
  const y = new Foo(x);
  y.mutate();
  return x;
}
