function Component(props) {
  let x = 5;
  let foo = () => {
    x = {};
  };
  foo();
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
