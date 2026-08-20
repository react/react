function Component(props) {
  const x = props.foo
    ? 1
    : (() => {
        throw new Error('Did not receive 1');
      })();
  return items;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{foo: true}],
};
