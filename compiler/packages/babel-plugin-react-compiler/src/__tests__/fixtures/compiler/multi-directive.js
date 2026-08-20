function Component() {
  'use foo';
  'use bar';
  return <div>"foo"</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: true,
};
