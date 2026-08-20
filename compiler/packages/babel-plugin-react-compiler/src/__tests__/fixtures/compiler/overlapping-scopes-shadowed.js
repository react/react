function foo(a, b) {
  let x = [];
  let y = [];
  y.push(b);
  x.push(a);
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
