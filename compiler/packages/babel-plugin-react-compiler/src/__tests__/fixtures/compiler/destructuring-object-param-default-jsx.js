function Component({a = 1}) {
  return <div>{a}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
  isComponent: true,
};
