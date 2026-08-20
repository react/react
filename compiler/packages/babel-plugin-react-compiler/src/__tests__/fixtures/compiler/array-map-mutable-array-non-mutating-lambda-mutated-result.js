function Component(props) {
  const x = [{}];
  const y = x.map(item => {
    return item;
  });
  y[0].flag = true;
  return [x, y];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
  isComponent: false,
};
