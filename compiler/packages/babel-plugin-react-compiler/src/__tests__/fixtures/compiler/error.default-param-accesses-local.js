function Component(
  x,
  y = () => {
    return x;
  }
) {
  return y();
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};
