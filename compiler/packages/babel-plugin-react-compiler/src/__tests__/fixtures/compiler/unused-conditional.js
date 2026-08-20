function Component(props) {
  let x = 0;
  (x = 1) && (x = 2);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
