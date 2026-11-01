function Component() {
  const text = 'hi';
  const [first] = text;
  return first;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: false,
};
