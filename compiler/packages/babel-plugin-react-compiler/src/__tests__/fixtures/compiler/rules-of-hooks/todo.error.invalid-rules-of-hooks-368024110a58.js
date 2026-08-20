// @skip
// Passed but should have failed

// Invalid because it's dangerous and might not warn otherwise.
// This *must* be invalid.
const FancyButton = forwardRef(function (props, ref) {
  if (props.fancy) {
    useCustomHook();
  }
  return <button ref={ref}>{props.children}</button>;
});
