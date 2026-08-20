function Component() {
  let v3, v4, acc;
  v3 = false;
  v4 = v3;
  acc = v3;
  if (acc) {
    acc = true;
    v3 = acc;
  }
  if (acc) {
    v3 = v4;
  }
  v4 = v3;
  return [acc, v3, v4];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};
