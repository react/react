function Component(p) {
  let x;
  const foo = () => {
    x = {};
  };
  foo();

  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
