function foo() {
  const x = {};
  const y = foo(x);
  y.mutate();
  return x;
}
