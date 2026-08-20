function Component() {
  let x = [1, 2, 3];
  let ret = [];
  do {
    let item = x.pop();
    ret.push(item * 2);
  } while (x.length);
  return ret;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: false,
};
