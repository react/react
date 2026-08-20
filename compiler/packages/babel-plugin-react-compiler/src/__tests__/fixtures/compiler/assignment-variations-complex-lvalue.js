function g() {
  const x = {y: {z: 1}};
  x.y.z = x.y.z + 1;
  x.y.z *= 2;
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: g,
  params: [],
  isComponent: false,
};
