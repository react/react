function foo() {
  const x = {x: 0};
  const y = {z: 0};
  const z = {z: 0};
  x.x += y.y *= 1;
  z.z += y.y *= x.x &= 3;
  return z;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
  isComponent: false,
};
