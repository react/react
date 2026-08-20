function Component(props) {
  let x = props.default;
  const y = 42;
  try {
    // note: this constant propagates so that we know
    // the handler is unreachable
    return y;
  } catch (e) {
    x = e;
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{default: 42}],
};
