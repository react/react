function component() {
  let x = {t: 1};
  let p = x.t;
  return p;
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: [],
  isComponent: false,
};
