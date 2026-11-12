// @validateRefAccessDuringRender
/**
 * This fixture tests fault tolerance: the compiler should report
 * multiple independent errors rather than stopping at the first one.
 *
 * Error 1: Ref access during render (ref.current)
 * Error 2: Mutation of frozen value (props)
 */
function Component(props) {
  const ref = useRef(null);

  // Error: reading ref during render
  const value = ref.current;

  // Error: mutating frozen value (props, which is frozen after hook call)
  props.items = [];

  return <div>{value}</div>;
}
