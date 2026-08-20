// @gating
function Component() {
  const name = Component.name;
  return <div>{name}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};
