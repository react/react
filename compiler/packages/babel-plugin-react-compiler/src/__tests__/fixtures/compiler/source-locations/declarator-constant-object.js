function Component() {
  const text = 'hi';
  const {length} = text;
  return length;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: false,
};
