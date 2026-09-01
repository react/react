// @validateExhaustiveMemoizationDependencies:false
function Component(props) {
  const x = useMemo(() => {
    if (props.cond) {
      if (props.cond) {
        return props.value;
      }
    }
  }, [props.cond]);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
