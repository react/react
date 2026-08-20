function Component(props) {
  let a = props.x;
  let b;
  let c;
  let d;
  if (props.cond) {
    d = ((b = a), a++, (c = a), ++a);
  }
  return [a, b, c, d];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{x: 2, cond: true}],
  isComponent: false,
};
