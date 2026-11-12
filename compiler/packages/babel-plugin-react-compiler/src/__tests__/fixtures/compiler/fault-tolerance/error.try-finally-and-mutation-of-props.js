/**
 * Fault tolerance test: two independent errors should both be reported.
 *
 * Error 1 (BuildHIR): `try/finally` is not supported
 * Error 2 (InferMutationAliasingEffects): Mutation of frozen props
 */
function Component(props) {
  // Error: try/finally (Todo from BuildHIR)
  try {
    doWork();
  } finally {
    doCleanup();
  }

  // Error: mutating frozen props
  props.value = 1;

  return <div>{props.value}</div>;
}
