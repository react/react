function Component([b]) {
  let f = b--;
  let g = --b;
  return [b, f, g];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [[3]],
  isComponent: false,
};
