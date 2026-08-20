function foo(a, b, c) {
  const x = [];
  if (a) {
    const y = [];
    y.push(b);
    x.push(<div>{y}</div>);
  } else {
    x.push(c);
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
