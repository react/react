// @compilationMode(infer)

/**
 * Test that nested arrow functions with component-like names are NOT compiled
 * when parent has 'use no memo'.
 */
function ParentComponent(props) {
  'use no memo';

  const NestedComponent = () => {
    return <div>{props.value}</div>;
  };

  return props.render(NestedComponent);
}

export const FIXTURE_ENTRYPOINT = {
  fn: ParentComponent,
  params: [{value: 'test', render: C => C()}],
  isComponent: true,
};
