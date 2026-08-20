function component(a) {
  let z = {a};
  let x = function () {
    console.log(z);
  };
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
