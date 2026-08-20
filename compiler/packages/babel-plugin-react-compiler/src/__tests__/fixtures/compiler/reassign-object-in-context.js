function Component(props) {
  let x = [];
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
