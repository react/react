function Component(limit) {
  let count = 0;
  for (let index = 0; index < limit; index++) {
    count += index;
  }
  return count;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [5],
  isComponent: false,
};
