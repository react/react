function foo() {
  const x = [];
  const y = {};
  y.x = x;
  mutate(x);
  return y;
}
