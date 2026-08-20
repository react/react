function Component(props) {
  let x = props.init;
  for (let i = 0; i < 100; i = i + 1) {
    x += i;
  }
  return [x];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{init: 0}],
};
