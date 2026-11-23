function Component(props) {
  const obj = {
    process(x) {
      'use no memo';
      const inner = y => y + 1;
      return inner(x);
    },
  };
  return obj.process(props.value);
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 42}],
};
