function component(a) {
  let x = 'foo';
  if (a) {
    x = 'bar';
  } else {
    x = 'baz';
  }
  let y = x;
  mutate(y);
  return y;
}
