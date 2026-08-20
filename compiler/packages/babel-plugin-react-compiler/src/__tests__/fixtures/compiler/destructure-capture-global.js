let someGlobal = {};
function component(a) {
  let x = {a, someGlobal};
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: ['value 1'],
  isComponent: false,
};
