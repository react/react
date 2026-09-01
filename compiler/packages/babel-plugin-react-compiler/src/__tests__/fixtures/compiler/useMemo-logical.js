// @validateExhaustiveMemoizationDependencies:false
function Component(props) {
  const x = useMemo(() => props.a && props.b);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
