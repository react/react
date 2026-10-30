// @compilationMode(infer)

/**
 * Test that deeply nested functions are NOT compiled when top-level parent has 'use no memo'.
 */
function ParentComponent(props) {
  'use no memo';

  function Level1() {
    function Level2() {
      return <div>{props.value}</div>;
    }
    return Level2;
  }

  return props.render(Level1());
}

export const FIXTURE_ENTRYPOINT = {
  fn: ParentComponent,
  params: [{value: 'test', render: C => C()}],
  isComponent: true,
};
