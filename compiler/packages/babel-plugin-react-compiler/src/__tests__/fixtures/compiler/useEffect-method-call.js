let x = {};
function Component() {
  React.useEffect(() => {
    x.foo = 1;
  });
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};
