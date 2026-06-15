function Component(props: {obj: {x: unknown}}) {
  (props.obj.x as unknown as number) = 1;
  return <div>{props.obj.x as number}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{obj: {x: 0}}],
};
