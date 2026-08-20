function foo(a, b, c, d) {
  let y = [];
  label: if (a) {
    if (b) {
      y.push(c);
      break label;
    }
    y.push(d);
  }
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
