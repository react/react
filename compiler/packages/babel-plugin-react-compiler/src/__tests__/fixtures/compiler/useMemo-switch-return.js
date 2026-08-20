// @validateExhaustiveMemoizationDependencies:false
function Component(props) {
  const x = useMemo(() => {
    let y;
    switch (props.switch) {
      case 'foo': {
        return 'foo';
      }
      case 'bar': {
        y = 'bar';
        break;
      }
      default: {
        y = props.y;
      }
    }
    return y;
  });
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
