// @validateRefAccessDuringRender
/**
 * Fault tolerance test: three independent errors should all be reported.
 *
 * Error 1 (BuildHIR): `try/finally` is not supported
 * Error 2 (ValidateNoRefAccessInRender): reading ref.current during render
 * Error 3 (InferMutationAliasingEffects): Mutation of frozen props
 */
function Component(props) {
  const ref = useRef(null);

  // Error: try/finally (Todo from BuildHIR)
  try {
    doWork();
  } finally {
    cleanup();
  }

  // Error: reading ref during render
  const value = ref.current;

  // Error: mutating frozen props
  props.items = [];

  return <div>{value}</div>;
}
