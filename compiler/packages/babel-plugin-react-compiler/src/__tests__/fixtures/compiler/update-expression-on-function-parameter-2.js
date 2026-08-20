function Component(a) {
  let d = a++;
  let e = ++a;
  return [a, d, e];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [2],
  isComponent: false,
};
