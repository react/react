function Component() {
  let x = [];
  let items = [{v: 0}, {v: 1}, {v: 2}];
  for (const {v} of items) {
    x.push(v * 2);
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: false,
};
