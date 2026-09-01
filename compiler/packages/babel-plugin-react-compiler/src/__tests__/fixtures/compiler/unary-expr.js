// @enablePreserveExistingMemoizationGuarantees:false
function component(a) {
  let t = {t: a};
  let z = +t.t;
  let q = -t.t;
  let p = void t.t;
  let n = delete t.t;
  let m = !t.t;
  let e = ~t.t;
  let f = typeof t.t;
  return {z, p, q, n, m, e, f};
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
