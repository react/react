function Component(x = () => [-1, true, 42.0, 'hello']) {
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};
