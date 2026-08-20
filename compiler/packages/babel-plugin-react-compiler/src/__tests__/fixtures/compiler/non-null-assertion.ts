interface ComponentProps {
  name?: string;
}

function Component(props: ComponentProps) {
  return props.name!.toUpperCase();
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{name: 'Alice'}],
};
