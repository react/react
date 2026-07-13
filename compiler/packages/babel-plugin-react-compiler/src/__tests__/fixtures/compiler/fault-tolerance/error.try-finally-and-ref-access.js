// @validateRefAccessDuringRender
/**
 * Fault tolerance test: two independent errors should both be reported.
 *
 * Error 1 (BuildHIR): `try/finally` is not supported
 * Error 2 (ValidateNoRefAccessInRender): reading ref.current during render
 */
function Component() {
  const ref = useRef(null);

  // Error: try/finally (Todo from BuildHIR)
  try {
    doSomething();
  } finally {
    cleanup();
  }

  // Error: reading ref during render
  const value = ref.current;

  return <div>{value}</div>;
}
