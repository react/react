function component(a) {
  let x = {a};
  let y = {};

  y.x = x['a'];
  mutate(y);
  return x;
}
