function component({a, b}) {
  let y = {a};
  let z = {b};
  return {y, z};
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
