function component() {
  let x = {};
  let q = {};
  x.t = q;
  let z = x.t;
  return z;
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: [],
  isComponent: false,
};
