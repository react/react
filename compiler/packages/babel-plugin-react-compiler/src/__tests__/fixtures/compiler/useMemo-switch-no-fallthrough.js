// @validateExhaustiveMemoizationDependencies:false
function Component(props) {
  const x = useMemo(() => {
    switch (props.key) {
      case 'key': {
        return props.value;
      }
      default: {
        return props.defaultValue;
      }
    }
  });
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
