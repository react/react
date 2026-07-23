function Component(props) {
  const computedKey = props.computedKey;
  return {
    [computedKey]() {
      return props.value;
    },
  };
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{computedKey: 'readValue', value: 42}],
};
