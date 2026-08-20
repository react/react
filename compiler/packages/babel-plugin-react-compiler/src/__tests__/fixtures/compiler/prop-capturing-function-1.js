function component(a, b) {
  let z = {a, b};
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
