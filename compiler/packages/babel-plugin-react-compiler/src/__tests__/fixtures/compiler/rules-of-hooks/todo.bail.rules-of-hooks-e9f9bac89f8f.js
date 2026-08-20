// @skip
// Unsupported input

// Valid because hooks can be used in anonymous arrow-function arguments
// to forwardRef.
const FancyButton = React.forwardRef((props, ref) => {
  useHook();
  return <button {...props} ref={ref} />;
});
