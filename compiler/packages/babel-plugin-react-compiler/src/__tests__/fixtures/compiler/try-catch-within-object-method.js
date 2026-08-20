function Component(props) {
  const object = {
    foo() {
      try {
        return [];
      } catch (e) {
        return;
      }
    },
  };
  return object.foo();
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
