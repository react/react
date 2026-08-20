function Component() {
  let x = [];
  let items = [0, 1, 2];
  for (const ii of items) {
    x.push(ii * 2);
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: false,
};
