function Component(props) {
  let x = [1, 2, 3];
  let ret = [];
  do {
    let item = x.pop();
    ret.push(item * 2);
  } while (x.length && props.cond);
  return ret;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
