function Component() {
  const [x, setX] = React.useState(1);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};
