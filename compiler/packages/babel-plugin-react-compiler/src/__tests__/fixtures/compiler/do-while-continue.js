function Component() {
  const x = [0, 1, 2, 3];
  const ret = [];
  do {
    const item = x.pop();
    if (item === 0) {
      continue;
    }
    ret.push(item / 2);
  } while (x.length);

  return ret;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: false,
};
