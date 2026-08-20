function foo(cond) {
  let items = [];
  for (const item of items) {
    let y = 0;
    if (cond) {
      y = 1;
    }
  }
  return items;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
