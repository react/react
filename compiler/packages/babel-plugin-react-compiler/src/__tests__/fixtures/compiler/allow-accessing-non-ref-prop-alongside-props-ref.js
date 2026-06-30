// @validateRefAccessDuringRender

/**
 * Regression test for https://github.com/facebook/react/issues/34342
 * Accessing both `props.ref` and a non-ref sibling property (here
 * `props.value`) on the same props object should not raise a ref
 * validation error on the sibling read.
 */
function Component(props) {
  return <div ref={props.ref}>{props.value}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 'hello'}],
};
