function foo() {
  const x = [];
  const y = {};
  y.x = x;
  mutate(y);
  return y;
}
