function Component(x: unknown) {
  // prettier-ignore
  const y = (x as string);
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['hi'],
  isComponent: false,
};
