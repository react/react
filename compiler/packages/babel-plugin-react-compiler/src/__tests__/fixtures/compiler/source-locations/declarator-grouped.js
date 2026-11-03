function Component() {
  const text = 'hi',
    [first] = text;
  return first;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: false,
};
