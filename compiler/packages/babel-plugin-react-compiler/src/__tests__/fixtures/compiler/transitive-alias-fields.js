function component() {
  let x = {};
  let p = {};
  let q = {};
  let y = {};

  x.y = y;
  p.y = x.y;
  q.y = p.y;

  mutate(q);
}
