function Component(props) {
  const callback = () => {
    try {
      return [];
    } catch (e) {
      return;
    }
  };
  return callback();
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
