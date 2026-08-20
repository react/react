function Component(props) {
  let x = [];
  let y = null;
  if (props.cond) {
    x.push(props.a);
    // oops no memo!
    return x;
  } else {
    y = foo();
    if (props.b) {
      return;
    }
  }
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{cond: true, a: 42}],
};
