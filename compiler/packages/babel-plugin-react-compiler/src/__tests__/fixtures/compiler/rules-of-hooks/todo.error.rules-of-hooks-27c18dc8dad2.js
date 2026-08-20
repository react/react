// @skip
// Unsupported input

// Invalid because it's dangerous and might not warn otherwise.
// This *must* be invalid.
const FancyButton = React.forwardRef((props, ref) => {
  if (props.fancy) {
    useCustomHook();
  }
  return <button ref={ref}>{props.children}</button>;
});
