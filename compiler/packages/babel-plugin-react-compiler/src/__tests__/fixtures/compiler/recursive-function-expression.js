function Component1() {
  const x = callback(10);
  function callback(x) {
    if (x == 0) {
      return null;
    }
    return callback(x - 1);
  }
  return x;
}

function Component() {
  function callback(x) {
    if (x == 0) {
      return null;
    }
    return callback(x - 1);
  }
  return callback(10);
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};
