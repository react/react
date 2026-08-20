function Component(foo, ...bar) {
  return [foo, bar];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['foo', 'bar', 'baz'],
};
