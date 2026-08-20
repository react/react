function Component() {
  const x = [0, 1, 2, 3];
  const ret = [];
  for (const item of x) {
    if (item === 0) {
      continue;
    }
    ret.push(item / 2);
  }
  return ret;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: false,
};
