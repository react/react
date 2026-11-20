function Component(props) {
  const a = [0, 0];
  let i = 0;
  a[i++] = i;
  return a.join(',');
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
  isComponent: false,
};
