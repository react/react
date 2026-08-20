function Component(props) {
  let x = [];
  if (props.cond) {
    x.push(props.a);
    if (props.b) {
      const y = [props.b];
      x.push(y);
      // oops no memo!
      return x;
    }
    // oops no memo!
    return x;
  } else {
    return foo();
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{cond: true, a: 42, b: 3.14}],
};
